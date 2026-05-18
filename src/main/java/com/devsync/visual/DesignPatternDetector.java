package com.devsync.visual;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;

import java.io.File;
import java.util.*;

public class DesignPatternDetector {
    
    private Map<String, ClassInfo> classes;
    private List<PatternInstance> detectedPatterns = new ArrayList<>();
    
    public DesignPatternDetector(Map<String, ClassInfo> classes) {
        this.classes = classes;
    }
    
    public List<PatternInstance> detectPatterns(String projectPath) {
        detectSingletonPattern();
        detectFactoryPattern();
        detectObserverPattern();
        detectStrategyPattern();
        detectDecoratorPattern();
        detectAdapterPattern();
        detectBuilderPattern();
        
        // Anti-patterns
        detectGodClass();
        detectDataClass();
        
        return detectedPatterns;
    }
    
    private void detectSingletonPattern() {
        classes.values().forEach(classInfo -> {
            try {
                File file = new File(classInfo.getFilePath());
                JavaParser parser = new JavaParser();
                CompilationUnit cu = parser.parse(file).getResult().orElse(null);
                
                if (cu == null) return;
                
                cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                    boolean hasPrivateConstructor = classDecl.getConstructors().stream()
                        .anyMatch(c -> c.isPrivate());
                    
                    boolean hasStaticInstance = classDecl.getFields().stream()
                        .anyMatch(f -> f.isStatic() && f.getVariables().stream()
                            .anyMatch(v -> v.getType().asString().equals(classDecl.getNameAsString())));
                    
                    boolean hasGetInstanceMethod = classDecl.getMethods().stream()
                        .anyMatch(m -> m.isStatic() && 
                            (m.getNameAsString().contains("getInstance") || 
                             m.getNameAsString().contains("instance")));
                    
                    if (hasPrivateConstructor && hasStaticInstance && hasGetInstanceMethod) {
                        detectedPatterns.add(new PatternInstance(
                            "Singleton",
                            classInfo.getFullName(),
                            "Ensures a class has only one instance and provides global access",
                            95
                        ));
                    }
                });
            } catch (Exception e) {
                // Skip file
            }
        });
    }
    
    private void detectFactoryPattern() {
        classes.values().forEach(classInfo -> {
            try {
                File file = new File(classInfo.getFilePath());
                JavaParser parser = new JavaParser();
                CompilationUnit cu = parser.parse(file).getResult().orElse(null);
                
                if (cu == null) return;
                
                cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                    boolean hasFactoryMethod = classDecl.getMethods().stream()
                        .anyMatch(m -> m.isStatic() && 
                            (m.getNameAsString().startsWith("create") || 
                             m.getNameAsString().startsWith("make") ||
                             m.getNameAsString().startsWith("build")) &&
                            !m.getType().asString().equals("void"));
                    
                    if (hasFactoryMethod && classDecl.getNameAsString().contains("Factory")) {
                        detectedPatterns.add(new PatternInstance(
                            "Factory",
                            classInfo.getFullName(),
                            "Creates objects without specifying exact class",
                            85
                        ));
                    }
                });
            } catch (Exception e) {
                // Skip file
            }
        });
    }
    
    private void detectObserverPattern() {
        classes.values().forEach(classInfo -> {
            try {
                File file = new File(classInfo.getFilePath());
                JavaParser parser = new JavaParser();
                CompilationUnit cu = parser.parse(file).getResult().orElse(null);
                
                if (cu == null) return;
                
                cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                    boolean hasObserverList = classDecl.getFields().stream()
                        .anyMatch(f -> f.getElementType().asString().contains("List") &&
                            f.getVariables().stream().anyMatch(v -> 
                                v.getNameAsString().toLowerCase().contains("listener") ||
                                v.getNameAsString().toLowerCase().contains("observer")));
                    
                    boolean hasNotifyMethod = classDecl.getMethods().stream()
                        .anyMatch(m -> m.getNameAsString().toLowerCase().contains("notify") ||
                                      m.getNameAsString().toLowerCase().contains("update"));
                    
                    boolean hasAddRemoveMethods = classDecl.getMethods().stream()
                        .anyMatch(m -> m.getNameAsString().startsWith("add") || 
                                      m.getNameAsString().startsWith("remove"));
                    
                    if (hasObserverList && hasNotifyMethod && hasAddRemoveMethods) {
                        detectedPatterns.add(new PatternInstance(
                            "Observer",
                            classInfo.getFullName(),
                            "Defines one-to-many dependency between objects",
                            90
                        ));
                    }
                });
            } catch (Exception e) {
                // Skip file
            }
        });
    }
    
    private void detectStrategyPattern() {
        classes.values().forEach(classInfo -> {
            if (classInfo.isInterface() && 
                (classInfo.getClassName().endsWith("Strategy") || 
                 classInfo.getClassName().endsWith("Policy"))) {
                
                detectedPatterns.add(new PatternInstance(
                    "Strategy",
                    classInfo.getFullName(),
                    "Defines family of algorithms and makes them interchangeable",
                    80
                ));
            }
        });
    }
    
    private void detectDecoratorPattern() {
        classes.values().forEach(classInfo -> {
            if (classInfo.getClassName().contains("Decorator") ||
                classInfo.getClassName().contains("Wrapper")) {
                
                detectedPatterns.add(new PatternInstance(
                    "Decorator",
                    classInfo.getFullName(),
                    "Adds responsibilities to objects dynamically",
                    75
                ));
            }
        });
    }
    
    private void detectAdapterPattern() {
        classes.values().forEach(classInfo -> {
            if (classInfo.getClassName().endsWith("Adapter") ||
                classInfo.getClassName().endsWith("Wrapper")) {
                
                detectedPatterns.add(new PatternInstance(
                    "Adapter",
                    classInfo.getFullName(),
                    "Converts interface of a class into another interface",
                    80
                ));
            }
        });
    }
    
    private void detectBuilderPattern() {
        classes.values().forEach(classInfo -> {
            try {
                File file = new File(classInfo.getFilePath());
                JavaParser parser = new JavaParser();
                CompilationUnit cu = parser.parse(file).getResult().orElse(null);
                
                if (cu == null) return;
                
                cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                    boolean hasBuilderClass = classDecl.getMembers().stream()
                        .anyMatch(m -> m instanceof ClassOrInterfaceDeclaration &&
                            ((ClassOrInterfaceDeclaration) m).getNameAsString().equals("Builder"));
                    
                    if (hasBuilderClass || classDecl.getNameAsString().endsWith("Builder")) {
                        detectedPatterns.add(new PatternInstance(
                            "Builder",
                            classInfo.getFullName(),
                            "Separates construction of complex object from representation",
                            85
                        ));
                    }
                });
            } catch (Exception e) {
                // Skip file
            }
        });
    }
    
    private void detectGodClass() {
        classes.values().forEach(classInfo -> {
            if (classInfo.getLinesOfCode() > 500 && classInfo.getComplexity() > 50) {
                detectedPatterns.add(new PatternInstance(
                    "God Class (Anti-pattern)",
                    classInfo.getFullName(),
                    "Class knows too much and does too much - violates Single Responsibility",
                    90
                ));
            }
        });
    }
    
    private void detectDataClass() {
        classes.values().forEach(classInfo -> {
            try {
                File file = new File(classInfo.getFilePath());
                JavaParser parser = new JavaParser();
                CompilationUnit cu = parser.parse(file).getResult().orElse(null);
                
                if (cu == null) return;
                
                cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                    long getterSetterCount = classDecl.getMethods().stream()
                        .filter(m -> m.getNameAsString().startsWith("get") || 
                                    m.getNameAsString().startsWith("set"))
                        .count();
                    
                    long totalMethods = classDecl.getMethods().size();
                    
                    if (totalMethods > 0 && getterSetterCount > totalMethods * 0.8) {
                        detectedPatterns.add(new PatternInstance(
                            "Data Class (Anti-pattern)",
                            classInfo.getFullName(),
                            "Class only holds data with no behavior - lacks encapsulation",
                            70
                        ));
                    }
                });
            } catch (Exception e) {
                // Skip file
            }
        });
    }
    
    public static class PatternInstance {
        private String patternName;
        private String className;
        private String description;
        private int confidence;
        
        public PatternInstance(String patternName, String className, String description, int confidence) {
            this.patternName = patternName;
            this.className = className;
            this.description = description;
            this.confidence = confidence;
        }
        
        public String getPatternName() { return patternName; }
        public String getClassName() { return className; }
        public String getDescription() { return description; }
        public int getConfidence() { return confidence; }
    }
}
