package com.devsync.visual;

import java.util.*;
import java.util.stream.Collectors;

public class CodeMetricsCalculator {
    
    private Map<String, ClassInfo> classes;
    private List<DependencyInfo> dependencies;
    
    public CodeMetricsCalculator(Map<String, ClassInfo> classes, List<DependencyInfo> dependencies) {
        this.classes = classes;
        this.dependencies = dependencies;
    }
    
    public Map<String, Object> calculateMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("couplingMetrics", calculateCouplingMetrics());
        metrics.put("cohesionMetrics", calculateCohesionMetrics());
        metrics.put("maintainabilityIndex", calculateMaintainabilityIndex());
        metrics.put("complexityHeatmap", generateComplexityHeatmap());
        metrics.put("technicalDebt", estimateTechnicalDebt());
        metrics.put("classMetrics", calculateDetailedClassMetrics());
        
        return metrics;
    }
    
    private Map<String, Object> calculateCouplingMetrics() {
        Map<String, Object> coupling = new HashMap<>();
        Map<String, CouplingData> classCoupling = new HashMap<>();
        
        classes.values().forEach(classInfo -> {
            String className = classInfo.getFullName();
            
            // Afferent Coupling (Ca) - number of classes that depend on this class
            long afferent = dependencies.stream()
                .filter(d -> d.getToClass().equals(className))
                .map(DependencyInfo::getFromClass)
                .distinct()
                .count();
            
            // Efferent Coupling (Ce) - number of classes this class depends on
            long efferent = dependencies.stream()
                .filter(d -> d.getFromClass().equals(className))
                .map(DependencyInfo::getToClass)
                .distinct()
                .count();
            
            // Instability (I) = Ce / (Ca + Ce)
            double instability = (afferent + efferent) > 0 ? 
                (double) efferent / (afferent + efferent) : 0;
            
            classCoupling.put(className, new CouplingData(
                (int) afferent, (int) efferent, instability
            ));
        });
        
        coupling.put("classCoupling", classCoupling);
        coupling.put("averageAfferent", classCoupling.values().stream()
            .mapToInt(CouplingData::getAfferent).average().orElse(0));
        coupling.put("averageEfferent", classCoupling.values().stream()
            .mapToInt(CouplingData::getEfferent).average().orElse(0));
        coupling.put("averageInstability", classCoupling.values().stream()
            .mapToDouble(CouplingData::getInstability).average().orElse(0));
        
        return coupling;
    }
    
    private Map<String, Object> calculateCohesionMetrics() {
        Map<String, Object> cohesion = new HashMap<>();
        Map<String, Double> classCohesion = new HashMap<>();
        
        classes.values().forEach(classInfo -> {
            // Simplified LCOM (Lack of Cohesion of Methods)
            // Lower is better (0 = perfect cohesion)
            double lcom = calculateLCOM(classInfo);
            classCohesion.put(classInfo.getFullName(), lcom);
        });
        
        cohesion.put("classCohesion", classCohesion);
        cohesion.put("averageLCOM", classCohesion.values().stream()
            .mapToDouble(Double::doubleValue).average().orElse(0));
        
        return cohesion;
    }
    
    private double calculateLCOM(ClassInfo classInfo) {
        // Simplified LCOM calculation based on complexity and LOC
        // In real implementation, would analyze method-field relationships
        int loc = classInfo.getLinesOfCode();
        int complexity = classInfo.getComplexity();
        
        if (loc == 0) return 0;
        
        // Heuristic: high complexity with high LOC suggests low cohesion
        double ratio = (double) complexity / loc;
        return Math.min(ratio * 100, 100); // Normalize to 0-100
    }
    
    private Map<String, Object> calculateMaintainabilityIndex() {
        Map<String, Object> maintainability = new HashMap<>();
        Map<String, MaintainabilityData> classIndex = new HashMap<>();
        
        classes.values().forEach(classInfo -> {
            // Microsoft's Maintainability Index formula (simplified)
            // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
            // Where: HV = Halstead Volume, CC = Cyclomatic Complexity, LOC = Lines of Code
            
            int loc = Math.max(classInfo.getLinesOfCode(), 1);
            int complexity = Math.max(classInfo.getComplexity(), 1);
            
            // Simplified calculation
            double mi = 171 - 5.2 * Math.log(loc * 10) - 0.23 * complexity - 16.2 * Math.log(loc);
            mi = Math.max(0, Math.min(100, mi)); // Clamp to 0-100
            
            String rating;
            if (mi >= 80) rating = "Excellent";
            else if (mi >= 60) rating = "Good";
            else if (mi >= 40) rating = "Moderate";
            else if (mi >= 20) rating = "Poor";
            else rating = "Critical";
            
            classIndex.put(classInfo.getFullName(), new MaintainabilityData(mi, rating));
        });
        
        maintainability.put("classIndex", classIndex);
        maintainability.put("averageIndex", classIndex.values().stream()
            .mapToDouble(MaintainabilityData::getIndex).average().orElse(0));
        
        return maintainability;
    }
    
    private Map<String, ComplexityLevel> generateComplexityHeatmap() {
        Map<String, ComplexityLevel> heatmap = new HashMap<>();
        
        classes.values().forEach(classInfo -> {
            int complexity = classInfo.getComplexity();
            int loc = classInfo.getLinesOfCode();
            
            ComplexityLevel level;
            String color;
            
            if (complexity <= 10 && loc <= 100) {
                level = ComplexityLevel.LOW;
                color = "#4ade80"; // Green
            } else if (complexity <= 20 && loc <= 250) {
                level = ComplexityLevel.MODERATE;
                color = "#fbbf24"; // Yellow
            } else if (complexity <= 40 && loc <= 500) {
                level = ComplexityLevel.HIGH;
                color = "#fb923c"; // Orange
            } else {
                level = ComplexityLevel.CRITICAL;
                color = "#ef4444"; // Red
            }
            
            heatmap.put(classInfo.getFullName(), level);
        });
        
        return heatmap;
    }
    
    private Map<String, Object> estimateTechnicalDebt() {
        Map<String, Object> debt = new HashMap<>();
        
        int totalMinutes = 0;
        Map<String, Integer> classDebt = new HashMap<>();
        
        for (ClassInfo classInfo : classes.values()) {
            int minutes = 0;
            
            // High complexity penalty
            if (classInfo.getComplexity() > 40) {
                minutes += (classInfo.getComplexity() - 40) * 5;
            }
            
            // Large class penalty
            if (classInfo.getLinesOfCode() > 500) {
                minutes += (classInfo.getLinesOfCode() - 500) / 10;
            }
            
            // High coupling penalty
            long couplingCount = dependencies.stream()
                .filter(d -> d.getFromClass().equals(classInfo.getFullName()))
                .count();
            if (couplingCount > 10) {
                minutes += (int) (couplingCount - 10) * 3;
            }
            
            if (minutes > 0) {
                classDebt.put(classInfo.getFullName(), minutes);
                totalMinutes += minutes;
            }
        }
        
        debt.put("totalMinutes", totalMinutes);
        debt.put("totalHours", totalMinutes / 60.0);
        debt.put("totalDays", totalMinutes / (60.0 * 8));
        debt.put("classDebt", classDebt);
        debt.put("severity", totalMinutes < 480 ? "Low" : 
                            totalMinutes < 2400 ? "Moderate" : 
                            totalMinutes < 9600 ? "High" : "Critical");
        
        return debt;
    }
    
    private List<DetailedClassMetric> calculateDetailedClassMetrics() {
        List<DetailedClassMetric> metrics = new ArrayList<>();
        
        classes.values().forEach(classInfo -> {
            long afferent = dependencies.stream()
                .filter(d -> d.getToClass().equals(classInfo.getFullName()))
                .count();
            
            long efferent = dependencies.stream()
                .filter(d -> d.getFromClass().equals(classInfo.getFullName()))
                .count();
            
            metrics.add(new DetailedClassMetric(
                classInfo.getFullName(),
                classInfo.getLinesOfCode(),
                classInfo.getComplexity(),
                (int) afferent,
                (int) efferent,
                classInfo.isInterface(),
                classInfo.isAbstract()
            ));
        });
        
        return metrics.stream()
            .sorted(Comparator.comparingInt(DetailedClassMetric::getComplexity).reversed())
            .collect(Collectors.toList());
    }
    
    // Supporting classes
    public static class CouplingData {
        private int afferent;
        private int efferent;
        private double instability;
        
        public CouplingData(int afferent, int efferent, double instability) {
            this.afferent = afferent;
            this.efferent = efferent;
            this.instability = instability;
        }
        
        public int getAfferent() { return afferent; }
        public int getEfferent() { return efferent; }
        public double getInstability() { return instability; }
    }
    
    public static class MaintainabilityData {
        private double index;
        private String rating;
        
        public MaintainabilityData(double index, String rating) {
            this.index = index;
            this.rating = rating;
        }
        
        public double getIndex() { return index; }
        public String getRating() { return rating; }
    }
    
    public enum ComplexityLevel {
        LOW, MODERATE, HIGH, CRITICAL
    }
    
    public static class DetailedClassMetric {
        private String className;
        private int linesOfCode;
        private int complexity;
        private int afferentCoupling;
        private int efferentCoupling;
        private boolean isInterface;
        private boolean isAbstract;
        
        public DetailedClassMetric(String className, int linesOfCode, int complexity,
                                  int afferentCoupling, int efferentCoupling,
                                  boolean isInterface, boolean isAbstract) {
            this.className = className;
            this.linesOfCode = linesOfCode;
            this.complexity = complexity;
            this.afferentCoupling = afferentCoupling;
            this.efferentCoupling = efferentCoupling;
            this.isInterface = isInterface;
            this.isAbstract = isAbstract;
        }
        
        public String getClassName() { return className; }
        public int getLinesOfCode() { return linesOfCode; }
        public int getComplexity() { return complexity; }
        public int getAfferentCoupling() { return afferentCoupling; }
        public int getEfferentCoupling() { return efferentCoupling; }
        public boolean isInterface() { return isInterface; }
        public boolean isAbstract() { return isAbstract; }
    }
}
