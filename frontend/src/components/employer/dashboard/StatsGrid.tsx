import React from 'react';
import { FiUsers, FiBriefcase, FiCalendar, FiUserCheck, FiTrendingUp } from 'react-icons/fi';
import cardStyles from './Cards.module.css';

interface StatsGridProps {
  stats: {
    totalApplicants: number;
    pendingReviews: number;
    openPositions: number;
    hiredThisMonth: number;
  };
  onNavigate?: (tab: string) => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onNavigate }) => {
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      <div className={cardStyles.statCard} onClick={() => onNavigate?.('applicants')} style={{cursor: 'pointer'}}>
        <div className={`${cardStyles.statIcon} ${cardStyles.primary}`} style={{
          background: 'linear-gradient(135deg, #2a2968, #343386)',
          boxShadow: '0 4px 16px rgba(52, 51, 134, 0.3)',
          width: '56px',
          height: '56px',
          borderRadius: '14px'
        }}>
          <FiUsers size={28} />
        </div>
        <div className={cardStyles.statContent}>
          <h3>{stats.totalApplicants}</h3>
          <p>Total Applicants</p>
          <div className={cardStyles.statTrend}>
            <FiTrendingUp className={`${cardStyles.trendIcon} ${cardStyles.up}`} size={14} />
            <span className={`${cardStyles.trendText} ${cardStyles.up}`}>+12% this month</span>
          </div>
        </div>
      </div>

      <div className={cardStyles.statCard} onClick={() => onNavigate?.('applicants')} style={{cursor: 'pointer'}}>
        <div className={`${cardStyles.statIcon} ${cardStyles.success}`} style={{
          background: 'linear-gradient(135deg, #2a2968, #343386)',
          boxShadow: '0 4px 16px rgba(52, 51, 134, 0.3)',
          width: '56px',
          height: '56px',
          borderRadius: '14px'
        }}>
          <FiUserCheck size={28} />
        </div>
        <div className={cardStyles.statContent}>
          <h3>{stats.pendingReviews}</h3>
          <p>Pending Reviews</p>
          <div className={cardStyles.statTrend}>
            <FiTrendingUp className={`${cardStyles.trendIcon} ${cardStyles.up}`} size={14} />
            <span className={`${cardStyles.trendText} ${cardStyles.up}`}>+5 new today</span>
          </div>
        </div>
      </div>

      <div className={cardStyles.statCard} onClick={() => onNavigate?.('jobs')} style={{cursor: 'pointer'}}>
        <div className={`${cardStyles.statIcon} ${cardStyles.warning}`} style={{
          background: 'linear-gradient(135deg, #2a2968, #343386)',
          boxShadow: '0 4px 16px rgba(52, 51, 134, 0.3)',
          width: '56px',
          height: '56px',
          borderRadius: '14px'
        }}>
          <FiBriefcase size={28} />
        </div>
        <div className={cardStyles.statContent}>
          <h3>{stats.openPositions}</h3>
          <p>Open Positions</p>
          <div className={cardStyles.statTrend}>
            <FiTrendingUp className={`${cardStyles.trendIcon} ${cardStyles.up}`} size={14} />
            <span className={`${cardStyles.trendText} ${cardStyles.up}`}>3 active</span>
          </div>
        </div>
      </div>

      <div className={cardStyles.statCard} onClick={() => onNavigate?.('applicants')} style={{cursor: 'pointer'}}>
        <div className={`${cardStyles.statIcon} ${cardStyles.info}`} style={{
          background: 'linear-gradient(135deg, #2a2968, #343386)',
          boxShadow: '0 4px 16px rgba(52, 51, 134, 0.3)',
          width: '56px',
          height: '56px',
          borderRadius: '14px'
        }}>
          <FiCalendar size={28} />
        </div>
        <div className={cardStyles.statContent}>
          <h3>{stats.hiredThisMonth}</h3>
          <p>Interviews This Week</p>
          <div className={cardStyles.statTrend}>
            <FiTrendingUp className={`${cardStyles.trendIcon} ${cardStyles.up}`} size={14} />
            <span className={`${cardStyles.trendText} ${cardStyles.up}`}>2 upcoming</span>
          </div>
        </div>
      </div>
    </div>
  );
};
