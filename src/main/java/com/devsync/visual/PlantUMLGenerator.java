package com.devsync.visual;

import net.sourceforge.plantuml.SourceStringReader;
import net.sourceforge.plantuml.FileFormat;
import net.sourceforge.plantuml.FileFormatOption;

import java.io.*;
import java.util.*;
import java.util.stream.Collectors;

public class PlantUMLGenerator {
    
    // Generate package-level diagram (Level 1)
    public String generatePackageDiagram(Map<String, Object> analysisResults) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        List<DependencyInfo> dependencies = (List<DependencyInfo>) analysisResults.get("dependencies");
        
        StringBuilder uml = new StringBuilder();
        uml.append("@startuml\n");
        uml.append("!theme plain\n");
        uml.append("skinparam packageStyle rectangle\n");
        uml.append("skinparam packageBackgroundColor lightblue\n");
        uml.append("skinparam packageBorderColor black\n");
        uml.append("skinparam arrowColor black\n");
        uml.append("skinparam arrowThickness 2\n\n");
        
        // Group classes by package
        Map<String, List<ClassInfo>> packageGroups = groupClassesByPackage(classes);
        
        // Create package boxes with stats
        for (Map.Entry<String, List<ClassInfo>> entry : packageGroups.entrySet()) {
            String packageName = entry.getKey().isEmpty() ? "default" : entry.getKey();
            List<ClassInfo> packageClasses = entry.getValue();
            
            int totalLOC = packageClasses.stream().mapToInt(ClassInfo::getLinesOfCode).sum();
            int avgComplexity = packageClasses.isEmpty() ? 0 : 
                packageClasses.stream().mapToInt(ClassInfo::getComplexity).sum() / packageClasses.size();
            
            uml.append("package \"").append(packageName).append("\\n");
            uml.append("Classes: ").append(packageClasses.size()).append("\\n");
            uml.append("LOC: ").append(totalLOC).append("\\n");
            uml.append("Avg Complexity: ").append(avgComplexity).append("\" {\n");
            uml.append("}\n\n");
        }
        
        // Add package dependencies
        Map<String, Set<String>> packageDeps = getPackageDependencies(dependencies, classes);
        for (Map.Entry<String, Set<String>> entry : packageDeps.entrySet()) {
            String fromPkg = entry.getKey().isEmpty() ? "default" : entry.getKey();
            for (String toPkg : entry.getValue()) {
                String toPkgName = toPkg.isEmpty() ? "default" : toPkg;
                if (!fromPkg.equals(toPkgName)) {
                    uml.append("[").append(fromPkg).append("] --> [").append(toPkgName).append("]\n");
                }
            }
        }
        
        uml.append("@enduml\n");
        return uml.toString();
    }
    
    // Generate class diagram for a specific package (Level 2)
    public String generatePackageClassDiagram(Map<String, Object> analysisResults, String packageName) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        List<DependencyInfo> dependencies = (List<DependencyInfo>) analysisResults.get("dependencies");
        
        StringBuilder uml = new StringBuilder();
        uml.append("@startuml\n");
        uml.append("!theme plain\n");
        uml.append("skinparam classBackgroundColor lightblue\n");
        uml.append("skinparam interfaceBackgroundColor lightgreen\n");
        uml.append("skinparam classBorderColor black\n");
        uml.append("skinparam arrowColor black\n\n");
        
        uml.append("title Classes in Package: ").append(packageName.isEmpty() ? "default" : packageName).append("\n\n");
        
        // Filter classes in this package
        List<ClassInfo> packageClasses = classes.values().stream()
            .filter(c -> (packageName.isEmpty() && (c.getPackageName() == null || c.getPackageName().isEmpty())) ||
                        (c.getPackageName() != null && c.getPackageName().equals(packageName)))
            .collect(Collectors.toList());
        
        // Generate class definitions
        for (ClassInfo classInfo : packageClasses) {
            generateClassDefinition(uml, classInfo);
        }
        
        // Generate relationships within package
        Set<String> packageClassNames = packageClasses.stream()
            .map(ClassInfo::getFullName)
            .collect(Collectors.toSet());
        
        for (DependencyInfo dep : dependencies) {
            if (packageClassNames.contains(dep.getFromClass()) && 
                packageClassNames.contains(dep.getToClass())) {
                generateRelationship(uml, dep, classes);
            }
        }
        
        uml.append("@enduml\n");
        return uml.toString();
    }
    
    // Generate focused diagram for a specific class (Level 3)
    public String generateClassFocusDiagram(Map<String, Object> analysisResults, String className) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        List<DependencyInfo> dependencies = (List<DependencyInfo>) analysisResults.get("dependencies");
        
        StringBuilder uml = new StringBuilder();
        uml.append("@startuml\n");
        uml.append("!theme plain\n");
        uml.append("skinparam classBackgroundColor lightblue\n");
        uml.append("skinparam interfaceBackgroundColor lightgreen\n");
        uml.append("skinparam classBorderColor black\n");
        uml.append("skinparam arrowColor black\n\n");
        
        ClassInfo focusClass = classes.get(className);
        if (focusClass == null) {
            uml.append("note \"Class not found: ").append(className).append("\" as N1\n");
            uml.append("@enduml\n");
            return uml.toString();
        }
        
        uml.append("title Dependencies for: ").append(focusClass.getClassName()).append("\n\n");
        
        // Highlight the focus class
        uml.append("class \"").append(focusClass.getClassName()).append("\" <<focus>> #yellow {\n");
        uml.append("  .. Statistics ..\n");
        uml.append("  LOC: ").append(focusClass.getLinesOfCode()).append("\n");
        uml.append("  Complexity: ").append(focusClass.getComplexity()).append("\n");
        uml.append("}\n\n");
        
        // Get all related classes (incoming and outgoing dependencies)
        Set<String> relatedClasses = new HashSet<>();
        List<DependencyInfo> relevantDeps = new ArrayList<>();
        
        for (DependencyInfo dep : dependencies) {
            if (dep.getFromClass().equals(className)) {
                relatedClasses.add(dep.getToClass());
                relevantDeps.add(dep);
            } else if (dep.getToClass().equals(className)) {
                relatedClasses.add(dep.getFromClass());
                relevantDeps.add(dep);
            }
        }
        
        // Generate related class definitions
        for (String relatedClassName : relatedClasses) {
            ClassInfo relatedClass = classes.get(relatedClassName);
            if (relatedClass != null) {
                generateSimpleClassDefinition(uml, relatedClass);
            } else {
                // External class
                uml.append("class \"").append(getSimpleClassName(relatedClassName))
                   .append("\" <<external>> #lightgray\n");
            }
        }
        
        uml.append("\n");
        
        // Generate relationships
        for (DependencyInfo dep : relevantDeps) {
            generateRelationship(uml, dep, classes);
        }
        
        uml.append("@enduml\n");
        return uml.toString();
    }
    
    public String generatePlantUMLText(Map<String, Object> analysisResults) {
        @SuppressWarnings("unchecked")
        Map<String, ClassInfo> classes = (Map<String, ClassInfo>) analysisResults.get("classes");
        @SuppressWarnings("unchecked")
        List<DependencyInfo> dependencies = (List<DependencyInfo>) analysisResults.get("dependencies");
        @SuppressWarnings("unchecked")
        Set<String> projectPackages = (Set<String>) analysisResults.get("projectPackages");
        
        StringBuilder uml = new StringBuilder();
        uml.append("@startuml\n");
        uml.append("!theme plain\n");
        uml.append("skinparam backgroundColor white\n");
        uml.append("skinparam classBackgroundColor lightblue\n");
        uml.append("skinparam interfaceBackgroundColor lightgreen\n");
        uml.append("skinparam packageBackgroundColor lightyellow\n");
        uml.append("skinparam classBorderColor black\n");
        uml.append("skinparam arrowColor black\n\n");
        
        // Group classes by package
        Map<String, List<ClassInfo>> packageGroups = groupClassesByPackage(classes);
        
        // Generate packages and classes
        for (Map.Entry<String, java.util.List<ClassInfo>> entry : packageGroups.entrySet()) {
            String packageName = entry.getKey();
            java.util.List<ClassInfo> packageClasses = entry.getValue();
            
            if (isProjectPackage(packageName, projectPackages)) {
                uml.append("package \"").append(packageName.isEmpty() ? "default" : packageName).append("\" {\n");
                
                for (ClassInfo classInfo : packageClasses) {
                    generateClassDefinition(uml, classInfo);
                }
                
                uml.append("}\n\n");
            }
        }
        
        // Generate external dependencies as simple classes
        Set<String> externalClasses = getExternalClasses(dependencies, classes);
        if (!externalClasses.isEmpty()) {
            uml.append("package \"External Libraries\" <<Cloud>> {\n");
            for (String extClass : externalClasses) {
                uml.append("  class \"").append(getSimpleClassName(extClass)).append("\" <<external>>\n");
            }
            uml.append("}\n\n");
        }
        
        // Generate relationships
        for (DependencyInfo dep : dependencies) {
            if (shouldIncludeDependency(dep, classes)) {
                generateRelationship(uml, dep, classes);
            }
        }
        
        uml.append("@enduml\n");
        return uml.toString();
    }
    
    public byte[] generateDiagramPNG(String plantUMLText) throws IOException {
        SourceStringReader reader = new SourceStringReader(plantUMLText);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        
        reader.outputImage(outputStream, new FileFormatOption(FileFormat.PNG));
        return outputStream.toByteArray();
    }
    
    public void saveDiagramToFile(String plantUMLText, String outputPath) throws IOException {
        byte[] pngData = generateDiagramPNG(plantUMLText);
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pngData);
        }
    }
    
    private Map<String, java.util.List<ClassInfo>> groupClassesByPackage(Map<String, ClassInfo> classes) {
        Map<String, java.util.List<ClassInfo>> groups = new HashMap<>();
        
        for (ClassInfo classInfo : classes.values()) {
            String packageName = classInfo.getPackageName();
            groups.computeIfAbsent(packageName, k -> new ArrayList<>()).add(classInfo);
        }
        
        return groups;
    }
    
    private void generateClassDefinition(StringBuilder uml, ClassInfo classInfo) {
        String className = classInfo.getClassName();
        
        if (classInfo.isInterface()) {
            uml.append("  interface ").append(className);
        } else if (classInfo.isAbstract()) {
            uml.append("  abstract class ").append(className);
        } else {
            uml.append("  class ").append(className);
        }
        
        // Add complexity and LOC as notes
        if (classInfo.getLinesOfCode() > 0 || classInfo.getComplexity() > 0) {
            uml.append(" {\n");
            if (classInfo.getLinesOfCode() > 0) {
                uml.append("    .. Statistics ..\n");
                uml.append("    LOC: ").append(classInfo.getLinesOfCode()).append("\n");
            }
            if (classInfo.getComplexity() > 1) {
                uml.append("    Complexity: ").append(classInfo.getComplexity()).append("\n");
            }
            uml.append("  }\n");
        } else {
            uml.append("\n");
        }
    }
    
    private void generateRelationship(StringBuilder uml, DependencyInfo dep, Map<String, ClassInfo> classes) {
        String fromClass = getSimpleClassName(dep.getFromClass());
        String toClass = getSimpleClassName(dep.getToClass());
        
        // Skip self-references
        if (fromClass.equals(toClass)) {
            return;
        }
        
        String arrow = getPlantUMLArrow(dep.getType());
        uml.append(fromClass).append(" ").append(arrow).append(" ").append(toClass);
        
        if (dep.getDescription() != null && !dep.getDescription().isEmpty()) {
            uml.append(" : ").append(dep.getDescription());
        }
        
        uml.append("\n");
    }
    
    private String getPlantUMLArrow(DependencyInfo.DependencyType type) {
        switch (type) {
            case EXTENDS:
                return "--|>";
            case IMPLEMENTS:
                return "..|>";
            case COMPOSITION:
                return "*--";
            case AGGREGATION:
                return "o--";
            case USES:
            default:
                return "-->";
        }
    }
    
    private boolean isProjectPackage(String packageName, Set<String> projectPackages) {
        return packageName.isEmpty() || projectPackages.contains(packageName);
    }
    
    private Set<String> getExternalClasses(List<DependencyInfo> dependencies, Map<String, ClassInfo> classes) {
        Set<String> external = new HashSet<>();
        
        for (DependencyInfo dep : dependencies) {
            if (!classes.containsKey(dep.getToClass()) && isImportantExternalClass(dep.getToClass())) {
                external.add(dep.getToClass());
            }
        }
        
        return external;
    }
    
    private boolean isImportantExternalClass(String className) {
        // Only include important external libraries, not basic Java classes
        return className.startsWith("org.springframework.") ||
               className.startsWith("com.github.javaparser.") ||
               className.startsWith("javax.") ||
               (className.startsWith("java.") && !className.startsWith("java.lang."));
    }
    
    private boolean shouldIncludeDependency(DependencyInfo dep, Map<String, ClassInfo> classes) {
        // Include if both classes are in the project
        if (classes.containsKey(dep.getFromClass()) && classes.containsKey(dep.getToClass())) {
            return true;
        }
        
        // Include if it's a dependency to an important external class
        if (classes.containsKey(dep.getFromClass()) && isImportantExternalClass(dep.getToClass())) {
            return true;
        }
        
        return false;
    }
    
    private String getSimpleClassName(String fullClassName) {
        if (fullClassName.contains(".")) {
            return fullClassName.substring(fullClassName.lastIndexOf(".") + 1);
        }
        return fullClassName;
    }
    
    private void generateSimpleClassDefinition(StringBuilder uml, ClassInfo classInfo) {
        String className = classInfo.getClassName();
        
        if (classInfo.isInterface()) {
            uml.append("interface ").append(className).append("\n");
        } else if (classInfo.isAbstract()) {
            uml.append("abstract class ").append(className).append("\n");
        } else {
            uml.append("class ").append(className).append("\n");
        }
    }
    
    private Map<String, Set<String>> getPackageDependencies(List<DependencyInfo> dependencies, Map<String, ClassInfo> classes) {
        Map<String, Set<String>> packageDeps = new HashMap<>();
        
        for (DependencyInfo dep : dependencies) {
            ClassInfo fromClass = classes.get(dep.getFromClass());
            ClassInfo toClass = classes.get(dep.getToClass());
            
            if (fromClass != null && toClass != null) {
                String fromPkg = fromClass.getPackageName() == null ? "" : fromClass.getPackageName();
                String toPkg = toClass.getPackageName() == null ? "" : toClass.getPackageName();
                
                packageDeps.computeIfAbsent(fromPkg, k -> new HashSet<>()).add(toPkg);
            }
        }
        
        return packageDeps;
    }
}