import React, { useState, useEffect } from "react";
import "./AnalyticsTab.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from "recharts";

// Mock data - replace with real API calls
const fetchAnalyticsData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        applicants: {
          active: 1250,
          inactive: 320,
          growth: 12.5
        },
        employers: {
          verified: 180,
          pending: 45,
          growth: 8.3
        },
        jobs: {
          active: 230,
          closed: 145,
          growth: 15.2
        },
        aiMatching: 78, // percentage
        totalUsers: 1795,
        monthlyGrowth: 11.8,
        skillsDemand: [
          { name: "Jan", "IT/Software": 120, "Healthcare": 80, "Engineering": 95, "BPO": 110 },
          { name: "Feb", "IT/Software": 150, "Healthcare": 85, "Engineering": 100, "BPO": 125 },
          { name: "Mar", "IT/Software": 180, "Healthcare": 90, "Engineering": 110, "BPO": 140 },
          { name: "Apr", "IT/Software": 210, "Healthcare": 95, "Engineering": 120, "BPO": 155 },
          { name: "May", "IT/Software": 240, "Healthcare": 100, "Engineering": 130, "BPO": 170 },
          { name: "Jun", "IT/Software": 265, "Healthcare": 105, "Engineering": 135, "BPO": 185 }
        ],
        userActivity: [
          { name: "Mon", logins: 450, applications: 120, matches: 85 },
          { name: "Tue", logins: 520, applications: 140, matches: 95 },
          { name: "Wed", logins: 480, applications: 135, matches: 90 },
          { name: "Thu", logins: 610, applications: 160, matches: 110 },
          { name: "Fri", logins: 580, applications: 155, matches: 105 },
          { name: "Sat", logins: 320, applications: 85, matches: 60 },
          { name: "Sun", logins: 280, applications: 70, matches: 50 }
        ],
        demographics: [
          { name: "18-25", value: 35, color: "#8884d8" },
          { name: "26-35", value: 40, color: "#82ca9d" },
          { name: "36-45", value: 20, color: "#ffc658" },
          { name: "46+", value: 5, color: "#ff7c7c" }
        ]
      });
    }, 1000);
  });
};

interface UsersTabProps {
  // Future: Add analytics data props
}

const UsersTab: React.FC<UsersTabProps> = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const analyticsData = await fetchAnalyticsData();
        setData(analyticsData);
      } catch (error) {      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="admin-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading user analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-content">
        <div className="error-container">
          <p>Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="analytics-header">
        <h1>User Analytics Dashboard</h1>
        <p>Comprehensive insights into user behavior and system performance</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-main-number">{data.totalUsers}</div>
            <div className="metric-subtitle">Total Users</div>
            <div className="metric-growth positive">
              +{data.monthlyGrowth}% this month
            </div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-main-number">{data.applicants.active}</div>
            <div className="metric-subtitle">Active Job Seekers</div>
            <div className="metric-growth positive">
              +{data.applicants.growth}% growth
            </div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">🏢</div>
          <div className="metric-content">
            <div className="metric-main-number">{data.employers.verified}</div>
            <div className="metric-subtitle">Verified Employers</div>
            <div className="metric-growth positive">
              +{data.employers.growth}% growth
            </div>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">🤖</div>
          <div className="metric-content">
            <div className="metric-main-number">{data.aiMatching}%</div>
            <div className="metric-subtitle">AI Matching Accuracy</div>
            <div className="metric-growth positive">
              Improving daily
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* User Activity Chart */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>Weekly User Activity</h3>
            <p>Daily user engagement metrics</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Daily Logins"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="applications" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Job Applications"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="matches" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name="AI Matches"
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Demand Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Skills in Demand</h3>
            <p>Monthly trends by industry</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.skillsDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="IT/Software" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="Healthcare" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="Engineering" 
                  stackId="1" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="BPO" 
                  stackId="1" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>User Demographics</h3>
            <p>Age distribution of users</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.demographics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.demographics.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Percentage']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersTab;
