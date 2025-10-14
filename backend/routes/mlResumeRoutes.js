const express = require('express');
const router = express.Router();
const MLResume = require('../models/MLResume');
const Resume = require('../models/Resume');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// GET /api/ml-resumes - Get all ML resumes (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const mlResumes = await MLResume.getAllActive();
    res.json({
      success: true,
      data: mlResumes,
      count: mlResumes.length
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML resumes',
      error: error.message
    });
  }
});

// GET /api/ml-resumes/search - Search ML resumes by skills
router.get('/search', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { skills } = req.query;
    
    if (!skills) {
      return res.status(400).json({
        success: false,
        message: 'Skills parameter is required'
      });
    }

    // Parse skills - can be comma-separated string or array
    const skillsArray = Array.isArray(skills) 
      ? skills 
      : skills.split(',').map(skill => skill.trim());

    const mlResumes = await MLResume.searchBySkills(skillsArray);
    
    res.json({
      success: true,
      data: mlResumes,
      count: mlResumes.length,
      searchedSkills: skillsArray
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to search ML resumes',
      error: error.message
    });
  }
});

// GET /api/ml-resumes/jobseeker/:uid - Get ML resume for specific job seeker
router.get('/jobseeker/:uid', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Check if user is accessing their own data or is admin
    if (req.user.uid !== uid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const mlResume = await MLResume.getByJobSeeker(uid);
    
    if (!mlResume) {
      return res.status(404).json({
        success: false,
        message: 'ML resume not found'
      });
    }

    res.json({
      success: true,
      data: mlResume
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML resume',
      error: error.message
    });
  }
});

// POST /api/ml-resumes/sync - Sync all resumes to ML collection (Admin only)
router.post('/sync', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get all active resumes
    const resumes = await Resume.find({ isActive: true });
    
    let syncedCount = 0;
    let errors = [];

    for (const resume of resumes) {
      try {
        await MLResume.createOrUpdateFromResume(resume);
        syncedCount++;
      } catch (error) {
        errors.push({
          resumeId: resume._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      syncedCount,
      totalResumes: resumes.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to sync resumes',
      error: error.message
    });
  }
});

// POST /api/ml-resumes/sync/:resumeId - Sync specific resume to ML collection
router.post('/sync/:resumeId', authMiddleware, async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Get the resume
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Check if user owns this resume or is admin
    if (req.user.uid !== resume.jobSeekerUid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const mlResume = await MLResume.createOrUpdateFromResume(resume);

    res.json({
      success: true,
      message: 'Resume synced successfully',
      data: mlResume
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to sync resume',
      error: error.message
    });
  }
});

// DELETE /api/ml-resumes/:id - Soft delete ML resume (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const mlResume = await MLResume.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!mlResume) {
      return res.status(404).json({
        success: false,
        message: 'ML resume not found'
      });
    }

    res.json({
      success: true,
      message: 'ML resume deleted successfully',
      data: mlResume
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to delete ML resume',
      error: error.message
    });
  }
});

// GET /api/ml-resumes/stats - Get ML resume statistics (Admin only)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalCount = await MLResume.countDocuments({ isActive: true });
    
    // Get skill statistics
    const skillStats = await MLResume.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        totalMLResumes: totalCount,
        topSkills: skillStats
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Failed to fetch ML resume statistics',
      error: error.message
    });
  }
});

module.exports = router;
