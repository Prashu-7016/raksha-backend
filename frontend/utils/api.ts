import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const API_BASE = `${BACKEND_URL}/api`;

export interface RegisterRequest {
  seed_hash: string;
  device_salt: string;
}

export interface LoginRequest {
  seed_hash: string;
  device_salt: string;
}

export interface IncidentReport {
  seed_hash: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category: string;
  severity: number;
  description?: string;
}

export interface HeatmapBounds {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export const api = {
  register: async (data: RegisterRequest) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    return response.json();
  },

  login: async (data: LoginRequest) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    return response.json();
  },

  reportIncident: async (data: IncidentReport) => {
    const response = await fetch(`${API_BASE}/incidents/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit report');
    }
    return response.json();
  },

  getHeatmapData: async (bounds: HeatmapBounds) => {
    const response = await fetch(`${API_BASE}/incidents/heatmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bounds),
    });
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    return response.json();
  },

  getRiskScore: async (lat: number, lng: number, radius: number = 1.0) => {
    const response = await fetch(
      `${API_BASE}/incidents/risk-score?lat=${lat}&lng=${lng}&radius_km=${radius}`
    );
    if (!response.ok) throw new Error('Failed to fetch risk score');
    return response.json();
  },

  getDangerZones: async (bounds: HeatmapBounds) => {
    const response = await fetch(`${API_BASE}/zones/danger-zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bounds),
    });
    if (!response.ok) throw new Error('Failed to fetch danger zones');
    return response.json();
  },
};