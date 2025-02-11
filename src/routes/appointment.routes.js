const express = require('express');
const {
    bookAppointment,
    rescheduleAppointment,
    getAppointments,
    getAvailableSlots,
    cancelAppointment
} = require('../controllers/appointment.controller');

const router = express.Router();

router.post('/book', bookAppointment); // Book an appointment
router.post('/appointment_slots', getAvailableSlots);
router.patch('/cancel_appointment',cancelAppointment);
// router.put('/cancel/:id', cancelAppointment); // Cancel an appointment
// router.put('/reschedule/:id', rescheduleAppointment); // Reschedule an appointment
// router.get('/', getAppointments); // Get all appointments

module.exports = router;
