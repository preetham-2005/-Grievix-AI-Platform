package com.grievix.model;

public enum Department {
    ROADS_DEPARTMENT("Roads Department"),
    WATER_DEPARTMENT("Water Department"),
    ELECTRICITY_BOARD("Electricity Board"),
    MUNICIPALITY("Municipality"),
    TRAFFIC_POLICE("Traffic Police"),
    PUBLIC_HEALTH("Public Health"),
    FOREST_DEPARTMENT("Forest Department"),
    POLICE("Police");

    private final String label;

    Department(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
