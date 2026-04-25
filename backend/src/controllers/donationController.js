import { Donation } from "../models/Donation.js";
import { User } from "../models/User.js";
import { recomputeReliabilityScore } from "../services/reliabilityService.js";

const toDonationResponse = (donationDoc) => {
  const donation = donationDoc?.toObject ? donationDoc.toObject() : donationDoc;
  const donor = donation?.donorId;
  const ngo = donation?.acceptedByNgoId;
  const volunteer = donation?.assignedVolunteerId;
  const payload = { ...donation };
  if (donor && typeof donor === "object") {
    payload.donorId = donor._id;
    payload.donorName = donor.name || "Donor";
    payload.donorPhone = donor.phone || "";
  }
  if (ngo && typeof ngo === "object") {
    payload.acceptedByNgoId = ngo._id;
    payload.ngoName = ngo.name || "NGO";
    payload.ngoPhone = ngo.phone || "";
  }
  if (volunteer && typeof volunteer === "object") {
    payload.assignedVolunteerId = volunteer._id;
    payload.volunteerName = volunteer.name || "Volunteer";
    payload.volunteerPhone = volunteer.phone || "";
  }
  return payload;
};

const notifyNearbyNgos = async (io, donation) => {
  const nearbyNgos = await User.find({
    role: "ngo",
    onboardingStatus: "approved",
    isActive: true,
    location: {
      $near: {
        $geometry: donation.location,
        $maxDistance: Number(process.env.NGO_ALERT_RADIUS_M || 8000)
      }
    }
  })
    .select("_id name")
    .limit(50);

  io.emit("notification:ngo:new-donation", {
    type: "ngo_new_donation",
    message: `New nearby donation posted: ${donation.foodType} (${donation.quantity})`,
    donationId: donation._id,
    targetUserIds: nearbyNgos.map((ngo) => ngo._id.toString())
  });
};

const notifyNearbyVolunteers = async (io, donation, ngoId) => {
  const ngo = await User.findById(ngoId).select("location");
  if (!ngo?.location) return;
  const nearbyVolunteers = await User.find({
    role: "volunteer",
    onboardingStatus: "approved",
    isActive: true,
    location: {
      $near: {
        $geometry: ngo.location,
        $maxDistance: Number(process.env.VOLUNTEER_ALERT_RADIUS_M || 10000)
      }
    }
  })
    .select("_id")
    .limit(100);

  io.emit("notification:volunteer:delivery-assigned", {
    type: "volunteer_delivery_assigned",
    message: `NGO accepted donation. Delivery help needed for ${donation.foodType}.`,
    donationId: donation._id,
    ngoId,
    targetUserIds: nearbyVolunteers.map((volunteer) => volunteer._id.toString())
  });
  if (!nearbyVolunteers.length) {
    io.emit("notification:ngo:no-volunteer-nearby", {
      type: "ngo_no_volunteer_nearby",
      message: `No nearby volunteers available for ${donation.foodType} at the moment.`,
      donationId: donation._id,
      targetUserIds: [ngoId.toString()]
    });
  }
};

const emitStatusNotification = async (io, donationDoc, type, message) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  const targetUserIds = [
    donationDoc?.donorId?._id || donationDoc?.donorId,
    donationDoc?.acceptedByNgoId?._id || donationDoc?.acceptedByNgoId,
    donationDoc?.assignedVolunteerId?._id || donationDoc?.assignedVolunteerId,
    ...admins.map((admin) => admin._id)
  ]
    .filter(Boolean)
    .map((id) => id.toString());
  io.emit("notification:delivery:status", {
    type,
    message,
    donationId: donationDoc?._id,
    targetUserIds: [...new Set(targetUserIds)]
  });
};

export const createDonation = async (req, res) => {
  const { donorId, foodType, quantity, pickupTime, expiryTime, lat, lng, imageUrl, locationText } = req.body;
  if (!donorId || !foodType || !quantity || !pickupTime || !expiryTime || lat === undefined || lng === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const donation = await Donation.create({
    donorId,
    foodType,
    quantity,
    pickupTime,
    expiryTime,
    imageUrl,
    locationText: locationText || "",
    location: {
      type: "Point",
      coordinates: [Number(lng), Number(lat)]
    }
  });

  await User.findByIdAndUpdate(donorId, {
    $inc: { "stats.donationsCreated": 1 }
  });
  await recomputeReliabilityScore(donorId);

  const donationWithDonor = await Donation.findById(donation._id)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone");
  req.io.emit("donation:new", toDonationResponse(donationWithDonor));
  await notifyNearbyNgos(req.io, donation);
  return res.status(201).json(toDonationResponse(donationWithDonor));
};

export const getNearbyDonations = async (req, res) => {
  const { lat, lng, radiusKm = 5 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: "lat and lng are required" });
  }

  const donations = await Donation.find({
    status: "pending",
    expiryTime: { $gt: new Date() },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: Number(radiusKm) * 1000
      }
    }
  })
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone")
    .limit(50);

  return res.json(donations.map((item) => toDonationResponse(item)));
};

export const listDonations = async (req, res) => {
  const { donorId, ngoId, volunteerId, status } = req.query;
  const filter = {};
  if (donorId) filter.donorId = donorId;
  if (ngoId) filter.acceptedByNgoId = ngoId;
  if (status) filter.status = status;
  if (volunteerId) {
    filter.status = { $in: ["accepted", "picked"] };
    filter.$or = [{ assignedVolunteerId: volunteerId }, { assignedVolunteerId: { $exists: false } }, { assignedVolunteerId: null }];
  }
  const donations = await Donation.find(filter)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone")
    .sort({ createdAt: -1 })
    .limit(300);
  return res.json(donations.map((item) => toDonationResponse(item)));
};

export const acceptDonation = async (req, res) => {
  const { donationId, ngoId, ngoPickupImageUrl } = req.body;
  if (!donationId || !ngoId) {
    return res.status(400).json({ message: "donationId and ngoId are required" });
  }

  const donation = await Donation.findOneAndUpdate(
    { _id: donationId, status: "pending" },
    {
      status: "accepted",
      acceptedByNgoId: ngoId,
      ngoPickupImageUrl: ngoPickupImageUrl || "",
      acceptedAt: new Date()
    },
    { new: true }
  );

  if (!donation) {
    return res.status(409).json({ message: "Donation unavailable" });
  }

  await User.findByIdAndUpdate(ngoId, {
    $inc: { "stats.acceptances": 1 }
  });
  await recomputeReliabilityScore(ngoId);

  const acceptedWithDonor = await Donation.findById(donation._id)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone");
  req.io.emit("donation:accepted", toDonationResponse(acceptedWithDonor));
  await notifyNearbyVolunteers(req.io, donation, ngoId);
  return res.json(toDonationResponse(acceptedWithDonor));
};

export const acceptVolunteerTask = async (req, res) => {
  const { donationId, volunteerId } = req.body;
  if (!donationId || !volunteerId) {
    return res.status(400).json({ message: "donationId and volunteerId are required" });
  }
  const donation = await Donation.findOneAndUpdate(
    {
      _id: donationId,
      status: "accepted",
      $or: [{ assignedVolunteerId: null }, { assignedVolunteerId: { $exists: false } }, { assignedVolunteerId: volunteerId }]
    },
    {
      assignedVolunteerId: volunteerId,
      volunteerAcceptedAt: new Date(),
      volunteerRejectedAt: null
    },
    { new: true }
  );
  if (!donation) {
    return res.status(409).json({ message: "Task unavailable. Another volunteer may have accepted it." });
  }
  const updated = await Donation.findById(donation._id)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone");
  const response = toDonationResponse(updated);
  req.io.emit("donation:status", response);
  await emitStatusNotification(
    req.io,
    updated,
    "delivery_volunteer_accepted",
    `${response.volunteerName || "Volunteer"} accepted delivery for ${response.foodType}. Pickup is scheduled.`
  );
  return res.json(response);
};

export const rejectVolunteerTask = async (req, res) => {
  const { donationId, volunteerId, reason } = req.body;
  if (!donationId || !volunteerId) {
    return res.status(400).json({ message: "donationId and volunteerId are required" });
  }
  const donation = await Donation.findOneAndUpdate(
    {
      _id: donationId,
      status: "accepted",
      assignedVolunteerId: volunteerId
    },
    {
      $unset: { assignedVolunteerId: 1, volunteerAcceptedAt: 1 },
      $set: { volunteerRejectedAt: new Date() }
    },
    { new: true }
  );
  if (!donation) {
    return res.status(409).json({ message: "Task cannot be rejected in current state." });
  }
  const updated = await Donation.findById(donation._id)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone");
  const response = toDonationResponse(updated);
  req.io.emit("donation:status", response);
  await emitStatusNotification(
    req.io,
    updated,
    "delivery_volunteer_rejected",
    `Volunteer rejected delivery for ${response.foodType}${reason ? `: ${reason}` : "."}`
  );
  return res.json(response);
};

export const updateDeliveryStatus = async (req, res) => {
  const { donationId, status, proofImageUrl, receiverName, receiverSignature, notes, volunteerId } = req.body;
  if (!donationId || !status) {
    return res.status(400).json({ message: "donationId and status are required" });
  }

  const allowed = ["picked", "delivered"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status transition" });
  }

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return res.status(404).json({ message: "Donation not found" });
  }
  if (volunteerId && donation.assignedVolunteerId?.toString() !== volunteerId.toString()) {
    return res.status(403).json({ message: "Only assigned volunteer can update delivery status" });
  }
  if (status === "picked" && donation.pickupTime && new Date() < new Date(donation.pickupTime)) {
    return res.status(400).json({ message: "Pickup time has not started yet" });
  }

  if (status === "delivered" && !proofImageUrl && !receiverName && !receiverSignature) {
    return res.status(400).json({
      message: "Delivery proof required: provide proofImageUrl or receiver details"
    });
  }

  donation.status = status;
  if (status === "delivered") {
    donation.deliveryProof = {
      proofImageUrl: proofImageUrl || "",
      receiverName: receiverName || "",
      receiverSignature: receiverSignature || "",
      notes: notes || "",
      confirmedAt: new Date()
    };
    donation.deliveredAt = new Date();
  }
  if (status === "picked") {
    donation.pickedAt = new Date();
  }
  await donation.save();

  if (status === "delivered") {
    await User.findByIdAndUpdate(donation.donorId, {
      $inc: { "stats.donationsDelivered": 1 }
    });
    if (donation.acceptedByNgoId) {
      await User.findByIdAndUpdate(donation.acceptedByNgoId, {
        $inc: { "stats.completions": 1 }
      });
    }
    await recomputeReliabilityScore(donation.donorId);
    await recomputeReliabilityScore(donation.acceptedByNgoId);
  }

  const updatedWithDonor = await Donation.findById(donation._id)
    .populate("donorId", "name phone")
    .populate("acceptedByNgoId", "name phone")
    .populate("assignedVolunteerId", "name phone");
  const response = toDonationResponse(updatedWithDonor);
  req.io.emit("donation:status", response);
  await emitStatusNotification(
    req.io,
    updatedWithDonor,
    status === "delivered" ? "delivery_completed" : "pickup_completed",
    status === "delivered"
      ? `${response.volunteerName || "Volunteer"} delivered ${response.foodType} to ${receiverName || "receiver"}.`
      : `${response.volunteerName || "Volunteer"} picked up ${response.foodType}.`
  );
  return res.json(response);
};

export const optimizeRoutePlan = async (req, res) => {
  const { ngoId } = req.query;
  const pendingAccepted = await Donation.find({
    status: { $in: ["accepted", "picked"] },
    ...(ngoId ? { acceptedByNgoId: ngoId } : {})
  }).sort({ expiryTime: 1 });

  const route = pendingAccepted.map((donation, index) => ({
    stop: index + 1,
    donationId: donation._id,
    foodType: donation.foodType,
    quantity: donation.quantity,
    status: donation.status,
    etaMinutes: 12 + index * 9,
    location: donation.location?.coordinates || [0, 0]
  }));

  return res.json({
    totalStops: route.length,
    estimatedTotalMinutes: route.reduce((sum, item) => sum + item.etaMinutes, 0),
    route
  });
};
