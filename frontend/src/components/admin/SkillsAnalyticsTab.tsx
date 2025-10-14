import React, { useState, useEffect } from 'react';
import { FiStar, FiTrendingUp, FiBarChart2, FiDownload, FiSearch, FiUsers } from 'react-icons/fi';
import StatsCard from './StatsCard';

interface SkillData {
  skill: string;
  demand: number;
  supply: number;
  growthRate: number;
  averageSalary?: number;
  jobPostings: number;
  applicants: number;
  category: 'technical' | 'soft' | 'industry' | 'language';
}

interface SkillTrend {
  skill: string;
  data: { month: string; demand: number; supply: number }[];
}

const SkillsAnalyticsTab: React.FC = () => {
  const [skillsData, setSkillsData] = useState<SkillData[]>([]);
  const [skillTrends, setSkillTrends] = useState<SkillTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'technical' | 'soft' | 'industry' | 'language'>('all');
  const [sortBy, setSortBy] = useState<'demand' | 'supply' | 'growth' | 'salary'>('demand');

  useEffect(() => {
    fetchSkillsAnalytics();
  }, []);

  const fetchSkillsAnalytics = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockSkillsData: SkillData[] = [
        {
          skill: 'JavaScript',
          demand: 85,
          supply: 65,
          growthRate: 15.2,
          averageSalary: 45000,
          jobPostings: 120,
          applicants: 89,
          category: 'technical'
        },
        {
          skill: 'React',
          demand: 78,
          supply: 58,
          growthRate: 22.1,
          averageSalary: 48000,
          jobPostings: 95,
          applicants: 67,
          category: 'technical'
        },
        {
          skill: 'Python',
          demand: 82,
          supply: 70,
          growthRate: 18.5,
          averageSalary: 52000,
          jobPostings: 110,
          applicants: 95,
          category: 'technical'
        },
        {
          skill: 'Communication',
          demand: 95,
          supply: 45,
          growthRate: 8.3,
          jobPostings: 200,
          applicants: 150,
          category: 'soft'
        },
        {
          skill: 'Project Management',
          demand: 72,
          supply: 40,
          growthRate: 12.7,
          averageSalary: 55000,
          jobPostings: 85,
          applicants: 42,
          category: 'soft'
        },
        {
          skill: 'Data Analysis',
          demand: 88,
          supply: 52,
          growthRate: 25.4,
          averageSalary: 50000,
          jobPostings: 75,
          applicants: 58,
          category: 'technical'
        },
        {
          skill: 'English',
          demand: 90,
          supply: 80,
          growthRate: 5.2,
          jobPostings: 180,
          applicants: 220,
          category: 'language'
        },
        {
          skill: 'Healthcare',
          demand: 76,
          supply: 35,
          growthRate: 14.8,
          averageSalary: 42000,
          jobPostings: 65,
          applicants: 28,
          category: 'industry'
        }
      ];

      const mockSkillTrends: SkillTrend[] = [
        {
          skill: 'JavaScript',
          data: [
            { month: 'Jan', demand: 78, supply: 60 },
            { month: 'Feb', demand: 82, supply: 62 },
            { month: 'Mar', demand: 85, supply: 65 }
          ]
        },
        {
          skill: 'React',
          data: [
            { month: 'Jan', demand: 70, supply: 52 },
            { month: 'Feb', demand: 74, supply: 55 },
            { month: 'Mar', demand: 78, supply: 58 }
          ]
        }
      ];

      setSkillsData(mockSkillsData);
      setSkillTrends(mockSkillTrends);
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skillsData
    .filter(skill => {
      const matchesSearch = skill.skill.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || skill.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'demand': return b.demand - a.demand;
        case 'supply': return b.supply - a.supply;
        case 'growth': return b.growthRate - a.growthRate;
        case 'salary': return (b.averageSalary || 0) - (a.averageSalary || 0);
        default: return 0;
      }
    });

  const getSkillGap = (skill: SkillData) => skill.demand - skill.supply;
  
  const getGapStatus = (gap: number) => {
    if (gap > 30) return 'high-demand';
    if (gap > 10) return 'moderate-demand';
    if (gap > -10) return 'balanced';
    return 'oversupplied';
  };

  const exportSkillsData = () => {
    const csvContent = [
      ['Skill', 'Category', 'Demand', 'Supply', 'Gap', 'Growth Rate', 'Avg Salary', 'Job Postings', 'Applicants'],
      ...filteredSkills.map(skill => [
        skill.skill,
        skill.category,
        skill.demand.toString(),
        skill.supply.toString(),
        getSkillGap(skill).toString(),
        `${skill.growthRate}%`,
        skill.averageSalary?.toString() || 'N/A',
        skill.jobPostings.toString(),
        skill.applicants.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skills-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topInDemandSkills = skillsData
    .sort((a, b) => getSkillGap(b) - getSkillGap(a))
    .slice(0, 5);

  const fastestGrowingSkills = skillsData
    .sort((a, b) => b.growthRate - a.growthRate)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-spinner"></div>
        <p>Loading skills analytics...</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="stats-grid">
        <StatsCard
          icon={FiUsers}
          value={skillsData.length}
          label="Total Skills Tracked"
          iconClassName="users"
        />
        <StatsCard
          icon={FiStar}
          value={skillsData.filter(s => getSkillGap(s) > 30).length}
          label="High Demand Skills"
          iconClassName="active-icon"
        />
        <StatsCard
          icon={FiTrendingUp}
          value={Math.round(skillsData.reduce((sum, s) => sum + s.growthRate, 0) / skillsData.length * 10) / 10}
          label="Avg Growth Rate %"
          iconClassName="employers"
        />
        <StatsCard
          icon={FiBarChart2}
          value={skillsData.reduce((sum, s) => sum + s.jobPostings, 0)}
          label="Total Job Postings"
          iconClassName="jobs"
        />
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Top In-Demand Skills</h3>
          <div className="skills-list">
            {topInDemandSkills.map((skill, index) => (
              <div key={skill.skill} className="skill-item">
                <div className="skill-rank">#{index + 1}</div>
                <div className="skill-info">
                  <span className="skill-name">{skill.skill}</span>
                  <span className={`skill-category ${skill.category}`}>{skill.category}</span>
                </div>
                <div className="skill-gap">
                  <span className={`gap-value ${getGapStatus(getSkillGap(skill))}`}>
                    Gap: {getSkillGap(skill)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Fastest Growing Skills</h3>
          <div className="skills-list">
            {fastestGrowingSkills.map((skill, index) => (
              <div key={skill.skill} className="skill-item">
                <div className="skill-rank">#{index + 1}</div>
                <div className="skill-info">
                  <span className="skill-name">{skill.skill}</span>
                  <span className={`skill-category ${skill.category}`}>{skill.category}</span>
                </div>
                <div className="skill-growth">
                  <FiTrendingUp className="growth-icon" />
                  <span className="growth-value">+{skill.growthRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-filter">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="soft">Soft Skills</option>
            <option value="industry">Industry</option>
            <option value="language">Language</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="filter-select"
          >
            <option value="demand">Demand</option>
            <option value="supply">Supply</option>
            <option value="growth">Growth Rate</option>
            <option value="salary">Average Salary</option>
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={exportSkillsData}>
            <FiDownload />
            Export Data
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Category</th>
              <th>Demand</th>
              <th>Supply</th>
              <th>Gap</th>
              <th>Growth Rate</th>
              <th>Avg Salary</th>
              <th>Job Postings</th>
              <th>Applicants</th>
            </tr>
          </thead>
          <tbody>
            {filteredSkills.map((skill) => {
              const gap = getSkillGap(skill);
              return (
                <tr key={skill.skill}>
                  <td>
                    <div className="skill-cell">
                      <strong>{skill.skill}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`category-badge ${skill.category}`}>
                      {skill.category}
                    </span>
                  </td>
                  <td>
                    <div className="metric-bar">
                      <div className="bar-fill demand" style={{ width: `${skill.demand}%` }}></div>
                      <span>{skill.demand}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="metric-bar">
                      <div className="bar-fill supply" style={{ width: `${skill.supply}%` }}></div>
                      <span>{skill.supply}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`gap-indicator ${getGapStatus(gap)}`}>
                      {gap > 0 ? '+' : ''}{gap}
                    </span>
                  </td>
                  <td>
                    <span className="growth-rate">
                      <FiTrendingUp className="growth-icon" />
                      +{skill.growthRate}%
                    </span>
                  </td>
                  <td>
                    {skill.averageSalary ? `₱${skill.averageSalary.toLocaleString()}` : 'N/A'}
                  </td>
                  <td>{skill.jobPostings}</td>
                  <td>{skill.applicants}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredSkills.length === 0 && (
        <div className="empty-state">
          <FiStar className="empty-icon" />
          <h3>No skills found</h3>
          <p>No skills match your current filters.</p>
        </div>
      )}
    </div>
  );
};

export default SkillsAnalyticsTab;
