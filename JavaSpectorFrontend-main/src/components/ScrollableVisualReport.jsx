import React, { useState, useEffect } from 'react'
import { X, TrendingUp, AlertTriangle, CheckCircle, Package, Code, Network, Activity, FileText, Layers, GitBranch, Target, Zap } from 'lucide-react'
import { Button } from './ui/button'

export function ScrollableVisualReport({ reportData, isOpen, onClose, isDarkMode, projectPath }) {
  const [currentDiagram, setCurrentDiagram] = useState(null)

  useEffect(() => {
    if (isOpen && reportData) {
      console.log('📊 ScrollableVisualReport - reportData received:', reportData)
      console.log('📦 packageDiagramBase64 exists:', !!reportData.packageDiagramBase64)
      console.log('📦 packageDiagramBase64 length:', reportData.packageDiagramBase64?.length || 0)
      
      if (reportData.packageDiagramBase64) {
        console.log('✅ Setting diagram from packageDiagramBase64')
        setCurrentDiagram(reportData.packageDiagramBase64)
      } else if (reportData.diagramBase64) {
        console.log('⚠️ Fallback to diagramBase64')
        setCurrentDiagram(reportData.diagramBase64)
      } else {
        console.log('❌ No diagram data found')
        setCurrentDiagram(null)
      }
    }
  }, [isOpen, reportData])

  if (!isOpen) return null
  
  if (!reportData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`p-8 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="text-lg font-medium">Loading visual report...</p>
          </div>
        </div>
      </div>
    )
  }

  const { projectName, analysisResults, diagramBase64, packageDiagramBase64 } = reportData
  const classes = analysisResults?.classes || {}
  const dependencies = analysisResults?.dependencies || []
  
  const totalClasses = Object.keys(classes).length
  const totalDependencies = dependencies.length
  const totalLOC = Object.values(classes).reduce((sum, cls) => sum + (cls.linesOfCode || 0), 0)
  const avgComplexity = totalClasses > 0 ? Math.round(Object.values(classes).reduce((sum, cls) => sum + (cls.complexity || 0), 0) / totalClasses) : 0
  
  const highComplexityClasses = Object.values(classes).filter(cls => cls.complexity > 10).length
  const interfaces = Object.values(classes).filter(cls => cls.interface).length
  const abstractClasses = Object.values(classes).filter(cls => cls.abstract).length

  const getQualityScore = () => {
    if (totalClasses === 0) return 100
    const complexityPenalty = (highComplexityClasses / totalClasses) * 30
    const sizePenalty = Math.min(20, (totalLOC / 10000) * 10)
    const dependencyPenalty = Math.min(15, (totalDependencies / totalClasses) * 5)
    return Math.max(0, Math.round(100 - complexityPenalty - sizePenalty - dependencyPenalty))
  }

  const qualityScore = getQualityScore()

  const getPackageStructure = () => {
    const packages = {}
    Object.entries(classes).forEach(([fullName, classInfo]) => {
      const pkg = classInfo.packageName || 'default'
      if (!packages[pkg]) {
        packages[pkg] = {
          name: pkg,
          classes: [],
          totalLOC: 0,
          totalComplexity: 0,
          classCount: 0
        }
      }
      packages[pkg].classes.push({ fullName, ...classInfo })
      packages[pkg].totalLOC += classInfo.linesOfCode || 0
      packages[pkg].totalComplexity += classInfo.complexity || 0
      packages[pkg].classCount++
    })
    return packages
  }

  const packageStructure = getPackageStructure()

  // Complexity distribution
  const complexityDistribution = {
    low: Object.values(classes).filter(c => c.complexity <= 5).length,
    moderate: Object.values(classes).filter(c => c.complexity > 5 && c.complexity <= 10).length,
    high: Object.values(classes).filter(c => c.complexity > 10 && c.complexity <= 15).length,
    critical: Object.values(classes).filter(c => c.complexity > 15).length
  }

  // Dependency types
  const dependencyTypes = {
    extends: dependencies.filter(d => d.type === 'EXTENDS').length,
    implements: dependencies.filter(d => d.type === 'IMPLEMENTS').length,
    uses: dependencies.filter(d => d.type === 'USES').length
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        
        {/* Fixed Header */}
        <div className={`flex items-center justify-between p-6 border-b sticky top-0 z-10 ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">📊 Architecture Report</h2>
            <p className="text-sm opacity-75">{projectName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-100px)] p-6 space-y-8">
          
          {/* 1. HERO METRICS */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/20' : 'bg-gradient-to-br from-blue-50 to-blue-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${qualityScore >= 80 ? 'bg-green-500' : qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-3xl font-bold">{qualityScore}%</div>
                </div>
                <p className="text-sm opacity-75">Quality Score</p>
              </div>

              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/20' : 'bg-gradient-to-br from-purple-50 to-purple-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Code className="h-6 w-6 text-purple-500" />
                  <div className="text-3xl font-bold">{totalClasses}</div>
                </div>
                <p className="text-sm opacity-75">Classes</p>
              </div>

              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-orange-900/40 to-orange-800/20' : 'bg-gradient-to-br from-orange-50 to-orange-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-6 w-6 text-orange-500" />
                  <div className="text-3xl font-bold">{(totalLOC / 1000).toFixed(1)}K</div>
                </div>
                <p className="text-sm opacity-75">Lines of Code</p>
              </div>

              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-green-900/40 to-green-800/20' : 'bg-gradient-to-br from-green-50 to-green-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Network className="h-6 w-6 text-green-500" />
                  <div className="text-3xl font-bold">{totalDependencies}</div>
                </div>
                <p className="text-sm opacity-75">Dependencies</p>
              </div>
            </div>
          </section>

          {/* 2. ARCHITECTURE DIAGRAM */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layers className="h-6 w-6 text-blue-500" />
              Package Architecture
            </h3>
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {currentDiagram ? (
                <img 
                  src={`data:image/png;base64,${currentDiagram}`}
                  alt="Architecture Diagram"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <div className={`text-center py-16 rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-100'
                }`}>
                  <Network className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium opacity-50">Architecture diagram will appear here</p>
                  <p className="text-sm opacity-30 mt-2">Diagram generation in progress or not available for this project</p>
                </div>
              )}
            </div>
          </section>

          {/* 3. COMPLEXITY DISTRIBUTION CHART */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-500" />
              Complexity Distribution
            </h3>
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="space-y-4">
                {/* Low Complexity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">🟢 Low (≤5)</span>
                    <span className="text-sm font-bold">{complexityDistribution.low} classes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(complexityDistribution.low / totalClasses) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Moderate Complexity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">🟡 Moderate (6-10)</span>
                    <span className="text-sm font-bold">{complexityDistribution.moderate} classes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(complexityDistribution.moderate / totalClasses) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* High Complexity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">🟠 High (11-15)</span>
                    <span className="text-sm font-bold">{complexityDistribution.high} classes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(complexityDistribution.high / totalClasses) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Critical Complexity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">🔴 Critical (&gt;15)</span>
                    <span className="text-sm font-bold">{complexityDistribution.critical} classes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(complexityDistribution.critical / totalClasses) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. PACKAGE BREAKDOWN TABLE */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-500" />
              Package Breakdown
            </h3>
            <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}>
                  <tr>
                    <th className="text-left p-4 font-semibold">Package</th>
                    <th className="text-center p-4 font-semibold">Classes</th>
                    <th className="text-center p-4 font-semibold">LOC</th>
                    <th className="text-center p-4 font-semibold">Avg Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(packageStructure).map(([pkgName, pkgData], idx) => (
                    <tr key={pkgName} className={idx % 2 === 0 ? (isDarkMode ? 'bg-gray-750' : 'bg-white') : ''}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          <span className="font-mono text-sm">{pkgName}</span>
                        </div>
                      </td>
                      <td className="text-center p-4 font-bold">{pkgData.classCount}</td>
                      <td className="text-center p-4">{pkgData.totalLOC.toLocaleString()}</td>
                      <td className="text-center p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          (pkgData.totalComplexity / pkgData.classCount) > 10 ? 'bg-red-500 text-white' :
                          (pkgData.totalComplexity / pkgData.classCount) > 5 ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {Math.round(pkgData.totalComplexity / pkgData.classCount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. DEPENDENCY TYPES PIE */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-green-500" />
              Dependency Types
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className="text-4xl font-bold text-blue-500 mb-2">{dependencyTypes.extends}</div>
                <p className="text-sm font-medium">Extends</p>
                <p className="text-xs opacity-75 mt-1">Inheritance relationships</p>
              </div>
              <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className="text-4xl font-bold text-purple-500 mb-2">{dependencyTypes.implements}</div>
                <p className="text-sm font-medium">Implements</p>
                <p className="text-xs opacity-75 mt-1">Interface implementations</p>
              </div>
              <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className="text-4xl font-bold text-green-500 mb-2">{dependencyTypes.uses}</div>
                <p className="text-sm font-medium">Uses</p>
                <p className="text-xs opacity-75 mt-1">Composition relationships</p>
              </div>
            </div>
          </section>

          {/* 6. TECHNICAL DEBT */}
          {analysisResults?.codeMetrics?.technicalDebt && (
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                Technical Debt
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <div className="text-3xl font-bold text-orange-500 mb-2">
                    {analysisResults.codeMetrics.technicalDebt.totalHours.toFixed(1)}h
                  </div>
                  <p className="text-sm font-medium">Estimated Time</p>
                </div>
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <div className="text-3xl font-bold text-red-500 mb-2">
                    {analysisResults.codeMetrics.technicalDebt.totalDays.toFixed(1)}d
                  </div>
                  <p className="text-sm font-medium">In Days</p>
                </div>
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-3xl font-bold mb-2 ${
                    analysisResults.codeMetrics.technicalDebt.severity === 'Low' ? 'text-green-500' :
                    analysisResults.codeMetrics.technicalDebt.severity === 'Moderate' ? 'text-yellow-500' :
                    analysisResults.codeMetrics.technicalDebt.severity === 'High' ? 'text-orange-500' : 'text-red-500'
                  }`}>
                    {analysisResults.codeMetrics.technicalDebt.severity}
                  </div>
                  <p className="text-sm font-medium">Severity</p>
                </div>
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className="text-3xl font-bold text-purple-500 mb-2">
                    {Object.keys(analysisResults.codeMetrics.technicalDebt.classDebt || {}).length}
                  </div>
                  <p className="text-sm font-medium">Classes Affected</p>
                </div>
              </div>
            </section>
          )}

          {/* 7. TOP COMPLEX CLASSES */}
          {analysisResults?.codeMetrics?.classMetrics && (
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="h-6 w-6 text-red-500" />
                Top 10 Most Complex Classes
              </h3>
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="space-y-3">
                  {analysisResults.codeMetrics.classMetrics.slice(0, 10).map((metric, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-lg ${
                      isDarkMode ? 'bg-gray-700' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          idx === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{metric.className.split('.').pop()}</p>
                          <p className="text-xs opacity-75">LOC: {metric.linesOfCode} | Coupling: {metric.afferentCoupling + metric.efferentCoupling}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                        metric.complexity > 40 ? 'bg-red-500 text-white' :
                        metric.complexity > 20 ? 'bg-orange-500 text-white' :
                        metric.complexity > 10 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {metric.complexity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 8. DESIGN PATTERNS */}
          {analysisResults?.designPatterns && analysisResults.designPatterns.length > 0 && (
            <section>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                Design Patterns Detected
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className="text-4xl font-bold text-green-500 mb-2">
                    {analysisResults.designPatterns.filter(p => !p.patternName.includes('Anti-pattern')).length}
                  </div>
                  <p className="text-sm font-medium">Good Patterns</p>
                </div>
                <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <div className="text-4xl font-bold text-red-500 mb-2">
                    {analysisResults.designPatterns.filter(p => p.patternName.includes('Anti-pattern')).length}
                  </div>
                  <p className="text-sm font-medium">Anti-patterns</p>
                </div>
                <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className="text-4xl font-bold text-blue-500 mb-2">
                    {analysisResults.designPatterns.length}
                  </div>
                  <p className="text-sm font-medium">Total Detected</p>
                </div>
              </div>
              <div className="space-y-3">
                {analysisResults.designPatterns.slice(0, 5).map((pattern, idx) => {
                  const isAntiPattern = pattern.patternName.includes('Anti-pattern')
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      isAntiPattern 
                        ? isDarkMode ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-500'
                        : isDarkMode ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{isAntiPattern ? '⚠️' : '✅'}</span>
                          <div>
                            <p className="font-bold">{pattern.patternName}</p>
                            <p className="text-xs opacity-75 font-mono">{pattern.className}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          pattern.confidence >= 90 ? 'bg-green-500 text-white' :
                          pattern.confidence >= 75 ? 'bg-blue-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                          {pattern.confidence}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 9. HEALTH SUMMARY */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Project Health Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className="text-sm opacity-75 mb-2">Avg Complexity</p>
                <p className="text-2xl font-bold">{avgComplexity}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className="text-sm opacity-75 mb-2">Interfaces</p>
                <p className="text-2xl font-bold">{interfaces}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className="text-sm opacity-75 mb-2">Abstract Classes</p>
                <p className="text-2xl font-bold">{abstractClasses}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className="text-sm opacity-75 mb-2">High Complexity</p>
                <p className={`text-2xl font-bold ${highComplexityClasses > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {highComplexityClasses}
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
