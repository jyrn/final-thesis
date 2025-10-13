/**
 * Human-in-the-Loop (HITL) Review Queue Service
 * Manages resume parsing review queue based on confidence scores
 */

const mongoose = require('mongoose');

// Review Queue Schema
const reviewQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume'
  },
  originalText: {
    type: String,
    required: true
  },
  parsedData: {
    type: Object,
    required: true
  },
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  lowConfidenceFields: [{
    field: String,
    confidence: Number,
    value: mongoose.Schema.Types.Mixed
  }],
  validationErrors: [{
    field: String,
    message: String,
    severity: {
      type: String,
      enum: ['error', 'warning', 'info']
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'corrected'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  corrections: {
    type: Object
  },
  feedback: {
    type: String
  },
  metadata: {
    format: String,
    parsingMethod: String,
    parsingDuration: Number,
    fileSize: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
reviewQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
reviewQueueSchema.index({ userId: 1 });
reviewQueueSchema.index({ confidenceScore: 1 });

const ReviewQueue = mongoose.model('ReviewQueue', reviewQueueSchema);

class ReviewQueueService {
  constructor() {
    this.confidenceThreshold = 0.75;
    this.fieldConfidenceThreshold = 0.7;
    console.log('✅ Review Queue Service initialized');
  }

  /**
   * Add resume to review queue if confidence is low
   */
  async addToQueueIfNeeded(userId, resumeId, originalText, parsedData, metadata) {
    try {
      // Calculate overall confidence
      const overallConfidence = metadata.overallConfidence || 0;
      
      // Identify low confidence fields
      const lowConfidenceFields = this.identifyLowConfidenceFields(
        parsedData,
        metadata.confidenceScores || {}
      );

      // Check validation errors
      const validationErrors = parsedData.validationErrors || [];

      // Determine if review is needed
      const needsReview = this.determineReviewNeed(
        overallConfidence,
        lowConfidenceFields,
        validationErrors,
        metadata
      );

      if (!needsReview.required) {
        console.log(`✅ Resume ${resumeId} does not need review (confidence: ${overallConfidence.toFixed(2)})`);
        return { addedToQueue: false, reason: needsReview.reason };
      }

      // Calculate priority
      const priority = this.calculatePriority(
        overallConfidence,
        lowConfidenceFields,
        validationErrors
      );

      // Create review queue entry
      const queueEntry = new ReviewQueue({
        userId,
        resumeId,
        originalText,
        parsedData,
        confidenceScore: overallConfidence,
        lowConfidenceFields,
        validationErrors: validationErrors.map(err => ({
          field: err.field,
          message: err.message,
          severity: err.severity || 'warning'
        })),
        status: 'pending',
        priority,
        metadata: {
          format: metadata.classification?.format,
          parsingMethod: metadata.parsingMethod || 'ml',
          parsingDuration: metadata.parsingDuration,
          fileSize: metadata.fileSize
        }
      });

      await queueEntry.save();

      console.log(`📋 Added resume ${resumeId} to review queue (priority: ${priority}, confidence: ${overallConfidence.toFixed(2)})`);

      return {
        addedToQueue: true,
        queueId: queueEntry._id,
        priority,
        reason: needsReview.reason
      };

    } catch (error) {
      console.error('Error adding to review queue:', error);
      throw error;
    }
  }

  /**
   * Determine if review is needed
   */
  determineReviewNeed(overallConfidence, lowConfidenceFields, validationErrors, metadata) {
    // Check overall confidence
    if (overallConfidence < this.confidenceThreshold) {
      return {
        required: true,
        reason: `Low overall confidence (${(overallConfidence * 100).toFixed(1)}%)`
      };
    }

    // Check for critical low confidence fields
    const criticalFields = lowConfidenceFields.filter(f => 
      ['name', 'email', 'phone'].includes(f.field) && f.confidence < 0.6
    );
    
    if (criticalFields.length > 0) {
      return {
        required: true,
        reason: `Critical fields with low confidence: ${criticalFields.map(f => f.field).join(', ')}`
      };
    }

    // Check for validation errors
    const errors = validationErrors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      return {
        required: true,
        reason: `${errors.length} validation error(s) detected`
      };
    }

    // Check for rare format
    if (metadata.classification?.confidence < 0.6) {
      return {
        required: true,
        reason: 'Rare or unusual resume format detected'
      };
    }

    // Check for many low confidence fields
    if (lowConfidenceFields.length > 5) {
      return {
        required: true,
        reason: `${lowConfidenceFields.length} fields with low confidence`
      };
    }

    return { required: false, reason: 'Confidence meets threshold' };
  }

  /**
   * Identify low confidence fields
   */
  identifyLowConfidenceFields(parsedData, confidenceScores) {
    const lowConfidenceFields = [];

    for (const [field, confidence] of Object.entries(confidenceScores)) {
      if (confidence < this.fieldConfidenceThreshold) {
        lowConfidenceFields.push({
          field,
          confidence,
          value: parsedData[field]
        });
      }
    }

    return lowConfidenceFields;
  }

  /**
   * Calculate priority (0-10, higher = more urgent)
   */
  calculatePriority(overallConfidence, lowConfidenceFields, validationErrors) {
    let priority = 5; // Base priority

    // Lower confidence = higher priority
    if (overallConfidence < 0.5) {
      priority += 3;
    } else if (overallConfidence < 0.65) {
      priority += 2;
    } else if (overallConfidence < 0.75) {
      priority += 1;
    }

    // More low confidence fields = higher priority
    if (lowConfidenceFields.length > 5) {
      priority += 2;
    } else if (lowConfidenceFields.length > 3) {
      priority += 1;
    }

    // Validation errors increase priority
    const errors = validationErrors.filter(e => e.severity === 'error');
    priority += Math.min(errors.length, 3);

    return Math.min(priority, 10);
  }

  /**
   * Get pending reviews (for admin dashboard)
   */
  async getPendingReviews(limit = 50, skip = 0) {
    try {
      const reviews = await ReviewQueue.find({ status: 'pending' })
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .lean();

      const total = await ReviewQueue.countDocuments({ status: 'pending' });

      return {
        reviews,
        total,
        hasMore: total > skip + limit
      };
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId) {
    try {
      return await ReviewQueue.findById(reviewId)
        .populate('userId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .lean();
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }

  /**
   * Submit review corrections
   */
  async submitCorrections(reviewId, reviewerId, corrections, feedback) {
    try {
      const review = await ReviewQueue.findById(reviewId);
      
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.status !== 'pending' && review.status !== 'in_review') {
        throw new Error('Review already completed');
      }

      // Update review
      review.status = 'corrected';
      review.reviewedBy = reviewerId;
      review.reviewedAt = new Date();
      review.corrections = corrections;
      review.feedback = feedback;
      review.updatedAt = new Date();

      await review.save();

      // Store corrections for training data
      await this.storeTrainingData(review);

      console.log(`✅ Review ${reviewId} completed with corrections`);

      return review;
    } catch (error) {
      console.error('Error submitting corrections:', error);
      throw error;
    }
  }

  /**
   * Approve parsed data without corrections
   */
  async approveReview(reviewId, reviewerId, feedback = '') {
    try {
      const review = await ReviewQueue.findById(reviewId);
      
      if (!review) {
        throw new Error('Review not found');
      }

      review.status = 'approved';
      review.reviewedBy = reviewerId;
      review.reviewedAt = new Date();
      review.feedback = feedback;
      review.updatedAt = new Date();

      await review.save();

      console.log(`✅ Review ${reviewId} approved`);

      return review;
    } catch (error) {
      console.error('Error approving review:', error);
      throw error;
    }
  }

  /**
   * Reject parsed data
   */
  async rejectReview(reviewId, reviewerId, reason) {
    try {
      const review = await ReviewQueue.findById(reviewId);
      
      if (!review) {
        throw new Error('Review not found');
      }

      review.status = 'rejected';
      review.reviewedBy = reviewerId;
      review.reviewedAt = new Date();
      review.feedback = reason;
      review.updatedAt = new Date();

      await review.save();

      console.log(`❌ Review ${reviewId} rejected`);

      return review;
    } catch (error) {
      console.error('Error rejecting review:', error);
      throw error;
    }
  }

  /**
   * Store corrections as training data
   */
  async storeTrainingData(review) {
    try {
      // Create training data schema if not exists
      const TrainingData = mongoose.models.TrainingData || mongoose.model('TrainingData', new mongoose.Schema({
        text: String,
        originalParsing: Object,
        corrections: Object,
        confidenceScore: Number,
        format: String,
        createdAt: { type: Date, default: Date.now }
      }));

      const trainingData = new TrainingData({
        text: review.originalText,
        originalParsing: review.parsedData,
        corrections: review.corrections,
        confidenceScore: review.confidenceScore,
        format: review.metadata?.format
      });

      await trainingData.save();

      console.log('📚 Training data stored for model improvement');
    } catch (error) {
      console.error('Error storing training data:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get review statistics
   */
  async getStatistics() {
    try {
      const stats = await ReviewQueue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidenceScore' },
            avgPriority: { $avg: '$priority' }
          }
        }
      ]);

      const totalReviews = await ReviewQueue.countDocuments();
      const avgReviewTime = await this.calculateAverageReviewTime();

      return {
        totalReviews,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgConfidence: stat.avgConfidence,
            avgPriority: stat.avgPriority
          };
          return acc;
        }, {}),
        avgReviewTime
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate average review time
   */
  async calculateAverageReviewTime() {
    try {
      const completedReviews = await ReviewQueue.find({
        status: { $in: ['approved', 'corrected', 'rejected'] },
        reviewedAt: { $exists: true }
      }).select('createdAt reviewedAt').lean();

      if (completedReviews.length === 0) {
        return 0;
      }

      const totalTime = completedReviews.reduce((sum, review) => {
        const duration = new Date(review.reviewedAt) - new Date(review.createdAt);
        return sum + duration;
      }, 0);

      return totalTime / completedReviews.length / 1000 / 60; // Convert to minutes
    } catch (error) {
      console.error('Error calculating average review time:', error);
      return 0;
    }
  }

  /**
   * Get training data for model retraining
   */
  async getTrainingData(limit = 1000) {
    try {
      const TrainingData = mongoose.models.TrainingData;
      
      if (!TrainingData) {
        return [];
      }

      return await TrainingData.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error fetching training data:', error);
      throw error;
    }
  }

  /**
   * Mark review as in progress
   */
  async markInReview(reviewId, reviewerId) {
    try {
      const review = await ReviewQueue.findById(reviewId);
      
      if (!review) {
        throw new Error('Review not found');
      }

      review.status = 'in_review';
      review.reviewedBy = reviewerId;
      review.updatedAt = new Date();

      await review.save();

      return review;
    } catch (error) {
      console.error('Error marking review in progress:', error);
      throw error;
    }
  }
}

module.exports = ReviewQueueService;
