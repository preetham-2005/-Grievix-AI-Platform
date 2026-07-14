package com.grievix.model;

public enum Category {
    ROAD_DAMAGE("Road Damage"),
    GARBAGE("Garbage"),
    WATER_LEAKAGE("Water Leakage"),
    STREET_LIGHT("Street Light"),
    ELECTRICITY("Electricity"),
    DRAINAGE("Drainage"),
    ILLEGAL_PARKING("Illegal Parking"),
    PUBLIC_TRANSPORT("Public Transport"),
    TREE_FALLEN("Tree Fallen"),
    POLLUTION("Pollution"),
    ENCROACHMENT("Encroachment"),
    NOISE_COMPLAINT("Noise Complaint"),
    ANIMAL_ISSUES("Animal Issues"),
    SANITATION("Sanitation"),
    OTHERS("Others");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
