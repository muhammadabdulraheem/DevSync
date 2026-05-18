package com.devsync.visual;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.io.image.ImageDataFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class VisualReportGenerator {
    
    public byte[] generateVisualArchitectureReport(Map<String, Object> analysisResults, 
                                                  byte[] diagramPNG, 
                                                  String projectName) throws IOException {
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc);
        
        try {
            // Title Page
            addTitlePage(document, projectName);
            document.add(new AreaBreak());
            
            // Executive Summary
            addExecutiveSummary(document, analysisResults);
            document.add(new AreaBreak());
            
            // Architecture Diagram
            addArchitectureDiagram(document, diagramPNG);
            document.add(new AreaBreak());
            
            // Detailed Analysis
            addDetailedAnalysis(document, analysisResults);
            document.add(new AreaBreak());
            
            // Manager-Friendly Explanation
            addManagerExplanation(document, analysisResults);
            
        } finally {
            document.close();
        }
        
        return outputStream.toByteArray();
    }
    
    private void addTitlePage(Document document, String projectName) {
        // Title
        Paragraph title = new Paragraph("Visual Architecture Report")
            .setFontSize(28)
            .setBold()
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(100);
        document.add(title);
        
        // Project name
        Paragraph project = new Paragraph(projectName != null ? projectName : "Java Project Analysis")
            .setFontSize(20)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(20);
        document.add(project);
        
        // Date
        Paragraph date = new Paragraph("Generated on: " + 
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' HH:mm")))
            .setFontSize(14)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(50);
        document.add(date);
        
        // DevSync branding
        Paragraph branding = new Paragraph("Powered by DevSync Code Analysis Tool")
            .setFontSize(12)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(200)
            .setFontColor(ColorConstants.GRAY);
        document.add(branding);
    }
    
    private void addExecutiveSummary(Document document, Map<String, Object> analysisResults) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        java.util.List<DependencyInfo> dependencies = (java.util.List<DependencyInfo>) analysisResults.get("dependencies");
        
        // Section title
        Paragraph sectionTitle = new Paragraph("Executive Summary")
            .setFontSize(20)
            .setBold()
            .setMarginBottom(20);
        document.add(sectionTitle);
        
        // Calculate metrics
        int totalClasses = classes.size();
        int totalDependencies = dependencies.size();
        int totalLOC = classes.values().stream().mapToInt(ClassInfo::getLinesOfCode).sum();
        int avgComplexity = classes.values().stream().mapToInt(ClassInfo::getComplexity).sum() / Math.max(1, totalClasses);
        
        // Calculate health score (0-100)
        int healthScore = calculateHealthScore(classes, dependencies, totalLOC);
        
        // Add Health Score Card
        addHealthScoreCard(document, healthScore);
        
        // Overview paragraph
        Paragraph overview = new Paragraph(String.format(
            "This report provides a comprehensive analysis of your Java codebase architecture. " +
            "The project contains %d classes with a total of %,d lines of code. " +
            "The system has %d inter-class dependencies with an average complexity score of %d per class. " +
            "This analysis helps identify the overall structure, maintainability, and potential areas for improvement.",
            totalClasses, totalLOC, totalDependencies, avgComplexity))
            .setMarginBottom(15);
        document.add(overview);
        
        // Key metrics table
        Table metricsTable = new Table(UnitValue.createPercentArray(new float[]{40, 60}))
            .setWidth(UnitValue.createPercentValue(100));
        
        metricsTable.addHeaderCell(new Cell().add(new Paragraph("Metric").setBold()));
        metricsTable.addHeaderCell(new Cell().add(new Paragraph("Value").setBold()));
        
        metricsTable.addCell("Total Classes");
        metricsTable.addCell(String.valueOf(totalClasses));
        
        metricsTable.addCell("Total Lines of Code");
        metricsTable.addCell(String.format("%,d", totalLOC));
        
        metricsTable.addCell("Class Dependencies");
        metricsTable.addCell(String.valueOf(totalDependencies));
        
        metricsTable.addCell("Average Complexity");
        metricsTable.addCell(String.valueOf(avgComplexity));
        
        long interfaces = classes.values().stream().filter(ClassInfo::isInterface).count();
        metricsTable.addCell("Interfaces");
        metricsTable.addCell(String.valueOf(interfaces));
        
        long abstractClasses = classes.values().stream().filter(ClassInfo::isAbstract).count();
        metricsTable.addCell("Abstract Classes");
        metricsTable.addCell(String.valueOf(abstractClasses));
        
        document.add(metricsTable);
        
        // Add Quality Indicators
        document.add(new Paragraph("\n"));
        addQualityIndicators(document, classes, dependencies, totalLOC);
    }
    
    private int calculateHealthScore(Map<String, ClassInfo> classes, java.util.List<DependencyInfo> dependencies, int totalLOC) {
        int score = 100;
        int totalClasses = classes.size();
        
        // Penalize high complexity
        long highComplexityClasses = classes.values().stream().filter(c -> c.getComplexity() > 10).count();
        double complexityRatio = (double) highComplexityClasses / totalClasses;
        score -= (int) (complexityRatio * 30);
        
        // Penalize high coupling
        double couplingRatio = (double) dependencies.size() / totalClasses;
        if (couplingRatio > 3) score -= 20;
        else if (couplingRatio > 2) score -= 10;
        
        // Penalize large classes
        long largeClasses = classes.values().stream().filter(c -> c.getLinesOfCode() > 300).count();
        double largeClassRatio = (double) largeClasses / totalClasses;
        score -= (int) (largeClassRatio * 20);
        
        // Reward good practices
        long interfaces = classes.values().stream().filter(ClassInfo::isInterface).count();
        if (interfaces > totalClasses * 0.1) score += 5;
        
        return Math.max(0, Math.min(100, score));
    }
    
    private void addHealthScoreCard(Document document, int healthScore) {
        Table scoreCard = new Table(UnitValue.createPercentArray(new float[]{100}))
            .setWidth(UnitValue.createPercentValue(100))
            .setMarginBottom(20);
        
        Cell scoreCell = new Cell();
        
        String grade;
        String interpretation;
        com.itextpdf.kernel.colors.Color color;
        
        if (healthScore >= 80) {
            grade = "A - Excellent";
            interpretation = "Your codebase is in excellent health with minimal technical debt.";
            color = ColorConstants.GREEN;
        } else if (healthScore >= 60) {
            grade = "B - Good";
            interpretation = "Your codebase is in good condition with some areas for improvement.";
            color = new com.itextpdf.kernel.colors.DeviceRgb(100, 200, 100);
        } else if (healthScore >= 40) {
            grade = "C - Fair";
            interpretation = "Your codebase needs attention to prevent future maintenance issues.";
            color = new com.itextpdf.kernel.colors.DeviceRgb(255, 200, 0);
        } else {
            grade = "D - Needs Improvement";
            interpretation = "Your codebase requires significant refactoring to reduce technical debt.";
            color = ColorConstants.RED;
        }
        
        Paragraph scoreTitle = new Paragraph("Overall Code Health Score")
            .setFontSize(14)
            .setBold()
            .setTextAlignment(TextAlignment.CENTER);
        
        Paragraph scoreValue = new Paragraph(healthScore + " / 100")
            .setFontSize(32)
            .setBold()
            .setFontColor(color)
            .setTextAlignment(TextAlignment.CENTER);
        
        Paragraph gradeText = new Paragraph(grade)
            .setFontSize(18)
            .setBold()
            .setFontColor(color)
            .setTextAlignment(TextAlignment.CENTER);
        
        Paragraph interpretationText = new Paragraph(interpretation)
            .setFontSize(12)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(10);
        
        scoreCell.add(scoreTitle);
        scoreCell.add(scoreValue);
        scoreCell.add(gradeText);
        scoreCell.add(interpretationText);
        scoreCell.setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(245, 245, 245));
        scoreCell.setPadding(20);
        
        scoreCard.addCell(scoreCell);
        document.add(scoreCard);
    }
    
    private void addQualityIndicators(Document document, Map<String, ClassInfo> classes, 
                                     java.util.List<DependencyInfo> dependencies, int totalLOC) {
        Paragraph qualityTitle = new Paragraph("Quality Indicators")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(qualityTitle);
        
        Table qualityTable = new Table(UnitValue.createPercentArray(new float[]{40, 20, 40}))
            .setWidth(UnitValue.createPercentValue(100));
        
        qualityTable.addHeaderCell(new Cell().add(new Paragraph("Indicator").setBold()));
        qualityTable.addHeaderCell(new Cell().add(new Paragraph("Status").setBold()));
        qualityTable.addHeaderCell(new Cell().add(new Paragraph("What It Means").setBold()));
        
        // Maintainability
        int avgLOC = totalLOC / Math.max(1, classes.size());
        String maintainStatus = avgLOC < 200 ? "✅ Good" : avgLOC < 300 ? "⚠️ Fair" : "❌ Poor";
        qualityTable.addCell("Maintainability");
        qualityTable.addCell(maintainStatus);
        qualityTable.addCell("How easy it is to modify and fix bugs");
        
        // Complexity
        int avgComplexity = classes.values().stream().mapToInt(ClassInfo::getComplexity).sum() / Math.max(1, classes.size());
        String complexityStatus = avgComplexity < 5 ? "✅ Good" : avgComplexity < 10 ? "⚠️ Fair" : "❌ Poor";
        qualityTable.addCell("Complexity");
        qualityTable.addCell(complexityStatus);
        qualityTable.addCell("How difficult it is to understand the code");
        
        // Coupling
        double couplingRatio = (double) dependencies.size() / classes.size();
        String couplingStatus = couplingRatio < 2 ? "✅ Good" : couplingRatio < 3 ? "⚠️ Fair" : "❌ Poor";
        qualityTable.addCell("Coupling");
        qualityTable.addCell(couplingStatus);
        qualityTable.addCell("How interconnected the components are");
        
        // Modularity
        long interfaces = classes.values().stream().filter(ClassInfo::isInterface).count();
        String modularityStatus = interfaces > classes.size() * 0.1 ? "✅ Good" : "⚠️ Fair";
        qualityTable.addCell("Modularity");
        qualityTable.addCell(modularityStatus);
        qualityTable.addCell("How well the code is organized into modules");
        
        document.add(qualityTable);
    }
    
    private void addArchitectureDiagram(Document document, byte[] diagramPNG) throws IOException {
        // Section title
        Paragraph sectionTitle = new Paragraph("System Architecture Diagram")
            .setFontSize(20)
            .setBold()
            .setMarginBottom(20);
        document.add(sectionTitle);
        
        // Description
        Paragraph description = new Paragraph(
            "The following diagram shows the high-level architecture of your system, " +
            "including class relationships, dependencies, and package structure. " +
            "This visual representation helps understand how different components interact.")
            .setMarginBottom(15);
        document.add(description);
        
        // Add diagram
        if (diagramPNG != null && diagramPNG.length > 0) {
            Image diagram = new Image(ImageDataFactory.create(diagramPNG))
                .setWidth(UnitValue.createPercentValue(90))
                .setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
            document.add(diagram);
        } else {
            Paragraph noDiagram = new Paragraph("Architecture diagram could not be generated.")
                .setFontColor(ColorConstants.RED)
                .setTextAlignment(TextAlignment.CENTER);
            document.add(noDiagram);
        }
    }
    
    private void addDetailedAnalysis(Document document, Map<String, Object> analysisResults) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        java.util.List<DependencyInfo> dependencies = (java.util.List<DependencyInfo>) analysisResults.get("dependencies");
        
        // Section title
        Paragraph sectionTitle = new Paragraph("Detailed Class Analysis")
            .setFontSize(20)
            .setBold()
            .setMarginBottom(20);
        document.add(sectionTitle);
        
        // Classes table
        Table classTable = new Table(UnitValue.createPercentArray(new float[]{30, 20, 15, 15, 20}))
            .setWidth(UnitValue.createPercentValue(100));
        
        // Headers
        classTable.addHeaderCell(new Cell().add(new Paragraph("Class Name").setBold()));
        classTable.addHeaderCell(new Cell().add(new Paragraph("Internal Dependencies").setBold()));
        classTable.addHeaderCell(new Cell().add(new Paragraph("External Dependencies").setBold()));
        classTable.addHeaderCell(new Cell().add(new Paragraph("Lines of Code").setBold()));
        classTable.addHeaderCell(new Cell().add(new Paragraph("Complexity").setBold()));
        
        // Sort classes by complexity (highest first)
        java.util.List<ClassInfo> sortedClasses = new ArrayList<>(classes.values());
        sortedClasses.sort((a, b) -> Integer.compare(b.getComplexity(), a.getComplexity()));
        
        // Add top 15 classes to avoid overwhelming the report
        for (int i = 0; i < Math.min(15, sortedClasses.size()); i++) {
            ClassInfo classInfo = sortedClasses.get(i);
            
            // Count dependencies for this class
            long internalDeps = dependencies.stream()
                .filter(dep -> dep.getFromClass().equals(classInfo.getFullName()))
                .filter(dep -> classes.containsKey(dep.getToClass()))
                .count();
            
            long externalDeps = dependencies.stream()
                .filter(dep -> dep.getFromClass().equals(classInfo.getFullName()))
                .filter(dep -> !classes.containsKey(dep.getToClass()))
                .count();
            
            classTable.addCell(classInfo.getClassName());
            classTable.addCell(String.valueOf(internalDeps));
            classTable.addCell(String.valueOf(externalDeps));
            classTable.addCell(String.valueOf(classInfo.getLinesOfCode()));
            
            // Color-code complexity
            Cell complexityCell = new Cell().add(new Paragraph(String.valueOf(classInfo.getComplexity())));
            if (classInfo.getComplexity() > 10) {
                complexityCell.setBackgroundColor(ColorConstants.LIGHT_GRAY);
            }
            classTable.addCell(complexityCell);
        }
        
        document.add(classTable);
        
        if (sortedClasses.size() > 15) {
            Paragraph note = new Paragraph(String.format(
                "Note: Showing top 15 classes by complexity. Total classes analyzed: %d", 
                sortedClasses.size()))
                .setFontSize(10)
                .setFontColor(ColorConstants.GRAY)
                .setMarginTop(10);
            document.add(note);
        }
    }
    
    private void addManagerExplanation(Document document, Map<String, Object> analysisResults) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        java.util.List<DependencyInfo> dependencies = (java.util.List<DependencyInfo>) analysisResults.get("dependencies");
        
        // Section title
        Paragraph sectionTitle = new Paragraph("Non-Technical Summary")
            .setFontSize(20)
            .setBold()
            .setMarginBottom(20);
        document.add(sectionTitle);
        
        // Add Project Overview for Non-Tech Users
        addProjectOverview(document, classes, dependencies);
        
        // What this means section
        Paragraph whatMeansTitle = new Paragraph("What This Analysis Means:")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(whatMeansTitle);
        
        com.itextpdf.layout.element.List whatMeansList = new com.itextpdf.layout.element.List()
            .setMarginBottom(15);
        
        whatMeansList.add(new ListItem("Classes: Individual components or modules of your software"));
        whatMeansList.add(new ListItem("Dependencies: How different parts of your code rely on each other"));
        whatMeansList.add(new ListItem("Complexity: How difficult it is to understand and modify each component"));
        whatMeansList.add(new ListItem("Lines of Code: The size of each component (more lines = more functionality but potentially harder to maintain)"));
        
        document.add(whatMeansList);
        
        // Business impact section
        Paragraph impactTitle = new Paragraph("Business Impact:")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(impactTitle);
        
        // Calculate some business metrics
        int totalClasses = classes.size();
        int highComplexityClasses = (int) classes.values().stream().filter(c -> c.getComplexity() > 10).count();
        int totalLOC = classes.values().stream().mapToInt(ClassInfo::getLinesOfCode).sum();
        
        com.itextpdf.layout.element.List impactList = new com.itextpdf.layout.element.List()
            .setMarginBottom(15);
        
        if (highComplexityClasses > totalClasses * 0.2) {
            impactList.add(new ListItem("⚠️ High Complexity Alert: " + highComplexityClasses + 
                " classes have high complexity, which may increase maintenance costs"));
        } else {
            impactList.add(new ListItem("✅ Good Complexity: Most classes have manageable complexity levels"));
        }
        
        if (totalLOC > 50000) {
            impactList.add(new ListItem("📈 Large Codebase: " + String.format("%,d", totalLOC) + 
                " lines of code indicates a substantial system requiring structured maintenance"));
        } else {
            impactList.add(new ListItem("📊 Moderate Size: " + String.format("%,d", totalLOC) + 
                " lines of code represents a manageable codebase"));
        }
        
        if (dependencies.size() > totalClasses * 2) {
            impactList.add(new ListItem("🔗 High Coupling: Many dependencies may make changes more risky and time-consuming"));
        } else {
            impactList.add(new ListItem("🔗 Reasonable Coupling: Dependencies are at manageable levels"));
        }
        
        document.add(impactList);
        
        // Add Risk Assessment
        document.add(new Paragraph("\n"));
        addRiskAssessment(document, classes, dependencies);
        
        // Add Cost & Time Implications
        document.add(new Paragraph("\n"));
        addCostTimeImplications(document, classes);
        
        // Recommendations section
        Paragraph recommendationsTitle = new Paragraph("Recommendations for Management:")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(recommendationsTitle);
        
        com.itextpdf.layout.element.List recommendationsList = new com.itextpdf.layout.element.List();
        
        recommendationsList.add(new ListItem("Regular code reviews to maintain quality and share knowledge"));
        recommendationsList.add(new ListItem("Invest in developer training for complex components"));
        recommendationsList.add(new ListItem("Consider refactoring high-complexity classes to reduce maintenance costs"));
        recommendationsList.add(new ListItem("Implement automated testing to ensure system reliability"));
        recommendationsList.add(new ListItem("Plan for technical debt reduction in future sprints"));
        
        document.add(recommendationsList);
        
        // Footer note
        Paragraph footer = new Paragraph(
            "This analysis provides insights into your codebase structure and quality. " +
            "Regular monitoring helps maintain system health and development velocity.")
            .setFontSize(10)
            .setFontColor(ColorConstants.GRAY)
            .setMarginTop(30)
            .setTextAlignment(TextAlignment.CENTER);
        document.add(footer);
    }
    
    private void addProjectOverview(Document document, Map<String, ClassInfo> classes, 
                                   java.util.List<DependencyInfo> dependencies) {
        Paragraph overviewTitle = new Paragraph("Project Overview (In Simple Terms)")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(overviewTitle);
        
        int totalClasses = classes.size();
        int totalLOC = classes.values().stream().mapToInt(ClassInfo::getLinesOfCode).sum();
        
        // Estimate development effort
        int estimatedDevMonths = totalLOC / 3000; // Rough estimate: 3000 LOC per developer-month
        
        Paragraph overview = new Paragraph(String.format(
            "Your software project consists of %d building blocks (classes) containing approximately %,d lines of code. " +
            "Based on industry standards, this represents roughly %d developer-months of work. " +
            "The system has %d connections between different parts, showing how components work together.",
            totalClasses, totalLOC, Math.max(1, estimatedDevMonths), dependencies.size()))
            .setMarginBottom(15);
        document.add(overview);
    }
    
    private void addRiskAssessment(Document document, Map<String, ClassInfo> classes, 
                                  java.util.List<DependencyInfo> dependencies) {
        Paragraph riskTitle = new Paragraph("Risk Assessment")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(riskTitle);
        
        Table riskTable = new Table(UnitValue.createPercentArray(new float[]{25, 25, 50}))
            .setWidth(UnitValue.createPercentValue(100));
        
        riskTable.addHeaderCell(new Cell().add(new Paragraph("Risk Factor").setBold()));
        riskTable.addHeaderCell(new Cell().add(new Paragraph("Level").setBold()));
        riskTable.addHeaderCell(new Cell().add(new Paragraph("Impact").setBold()));
        
        int totalClasses = classes.size();
        
        // Technical Debt Risk
        long highComplexityClasses = classes.values().stream().filter(c -> c.getComplexity() > 10).count();
        double techDebtRatio = (double) highComplexityClasses / totalClasses;
        String techDebtLevel = techDebtRatio > 0.3 ? "🔴 High" : techDebtRatio > 0.15 ? "🟡 Medium" : "🟢 Low";
        riskTable.addCell("Technical Debt");
        riskTable.addCell(techDebtLevel);
        riskTable.addCell("Affects future development speed and bug frequency");
        
        // Maintenance Risk
        long largeClasses = classes.values().stream().filter(c -> c.getLinesOfCode() > 300).count();
        double maintenanceRatio = (double) largeClasses / totalClasses;
        String maintenanceLevel = maintenanceRatio > 0.3 ? "🔴 High" : maintenanceRatio > 0.15 ? "🟡 Medium" : "🟢 Low";
        riskTable.addCell("Maintenance Difficulty");
        riskTable.addCell(maintenanceLevel);
        riskTable.addCell("Impacts cost and time to fix bugs or add features");
        
        // Change Risk
        double couplingRatio = (double) dependencies.size() / totalClasses;
        String changeLevel = couplingRatio > 3 ? "🔴 High" : couplingRatio > 2 ? "🟡 Medium" : "🟢 Low";
        riskTable.addCell("Change Propagation");
        riskTable.addCell(changeLevel);
        riskTable.addCell("Risk that changes in one area break other areas");
        
        // Knowledge Risk
        String knowledgeLevel = totalClasses > 100 ? "🟡 Medium" : "🟢 Low";
        riskTable.addCell("Knowledge Transfer");
        riskTable.addCell(knowledgeLevel);
        riskTable.addCell("Difficulty for new developers to understand the system");
        
        document.add(riskTable);
    }
    
    private void addCostTimeImplications(Document document, Map<String, ClassInfo> classes) {
        Paragraph costTitle = new Paragraph("Cost & Time Implications")
            .setFontSize(16)
            .setBold()
            .setMarginBottom(10);
        document.add(costTitle);
        
        int totalLOC = classes.values().stream().mapToInt(ClassInfo::getLinesOfCode).sum();
        int avgComplexity = classes.values().stream().mapToInt(ClassInfo::getComplexity).sum() / Math.max(1, classes.size());
        long highComplexityClasses = classes.values().stream().filter(c -> c.getComplexity() > 10).count();
        
        com.itextpdf.layout.element.List costList = new com.itextpdf.layout.element.List()
            .setMarginBottom(15);
        
        // Development velocity
        if (avgComplexity > 8) {
            costList.add(new ListItem("⏱️ Development Speed: High complexity may slow down new feature development by 30-50%"));
        } else {
            costList.add(new ListItem("⏱️ Development Speed: Current complexity supports efficient feature development"));
        }
        
        // Bug fix time
        if (highComplexityClasses > classes.size() * 0.2) {
            costList.add(new ListItem("🐛 Bug Fix Time: Complex code may increase debugging time by 2-3x compared to simpler code"));
        } else {
            costList.add(new ListItem("🐛 Bug Fix Time: Code structure supports efficient bug identification and fixes"));
        }
        
        // Onboarding time
        int onboardingWeeks = Math.min(12, totalLOC / 5000);
        costList.add(new ListItem(String.format(
            "👥 Onboarding Time: New developers may need %d-%d weeks to become productive",
            Math.max(2, onboardingWeeks - 2), onboardingWeeks + 2)));
        
        // Testing effort
        if (avgComplexity > 8) {
            costList.add(new ListItem("🧪 Testing Effort: High complexity requires more comprehensive testing (40-50% of development time)"));
        } else {
            costList.add(new ListItem("🧪 Testing Effort: Moderate complexity allows efficient testing (30-40% of development time)"));
        }
        
        // Refactoring investment
        if (highComplexityClasses > 0) {
            int refactoringWeeks = (int) Math.ceil(highComplexityClasses / 5.0);
            costList.add(new ListItem(String.format(
                "🔧 Refactoring Investment: Estimated %d-%d weeks to improve high-complexity areas",
                refactoringWeeks, refactoringWeeks * 2)));
        }
        
        document.add(costList);
        
        // ROI Note
        Paragraph roiNote = new Paragraph(
            "💡 Investment Tip: Addressing technical debt early typically saves 3-5x the cost compared to fixing issues later in production.")
            .setFontSize(11)
            .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(255, 250, 205))
            .setPadding(10)
            .setMarginTop(10);
        document.add(roiNote);
    }
}