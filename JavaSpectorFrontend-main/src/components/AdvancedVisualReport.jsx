import React, { useState, useEffect } from 'react'
import { X, FileText, Code, Network, TrendingUp, AlertTriangle, CheckCircle, BarChart3, PieChart, Activity, ChevronRight, Home, Package, Layers } from 'lucide-react'
import { Button } from './ui/button'
import api from '../api'

export function AdvancedVisualReport({ reportData, isOpen, onClose, isDarkMode, projectPath }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [viewLevel, setViewLevel] = useState('packages') // 'packages', 'classes', 'details'
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [currentDiagram, setCurrentDiagram] = useState(null)
  const [loadingDiagram, setLoadingDiagram] = useState(false)

  // Initialize with package diagram - MUST BE BEFORE EARLY RETURNS
  useEffect(() => {
    console.log('🎨 AdvancedVisualReport useEffect triggered')
    console.log('  isOpen:', isOpen)
    console.log('  reportData:', reportData)
    console.log('  packageDiagramBase64:', reportData?.packageDiagramBase64 ? 'EXISTS (length: ' + reportData.packageDiagramBase64.length + ')' : 'MISSING')
    
    if (isOpen && reportData?.packageDiagramBase64) {
      console.log('✅ Setting currentDiagram from packageDiagramBase64')
      setCurrentDiagram(reportData.packageDiagramBase64)
    } else {
      console.log('❌ Cannot set diagram - isOpen:', isOpen, 'has packageDiagramBase64:', !!reportData?.packageDiagramBase64)
    }
  }, [isOpen, reportData?.packageDiagramBase64])

  // Early returns AFTER all hooks
  if (!isOpen) return null
  
  // Show loading state if reportData is not yet available
  if (!reportData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`p-8 rounded-lg shadow-xl ${
          isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="text-lg font-medium">Loading visual report...</p>
            <p className="text-sm opacity-75">Please wait while we analyze your project</p>
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'architecture', label: 'Architecture', icon: Network },
    { id: 'dependencies', label: 'Interactive Graph', icon: Network },
    { id: 'metrics', label: 'Code Metrics', icon: Activity },
    { id: 'patterns', label: 'Design Patterns', icon: TrendingUp },
    { id: 'classes', label: 'Classes', icon: Code },
    { id: 'insights', label: 'Insights', icon: TrendingUp }
  ]

  const getComplexityColor = (complexity) => {
    if (complexity > 15) return 'bg-red-500'
    if (complexity > 10) return 'bg-orange-500'
    if (complexity > 5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getQualityScore = () => {
    if (totalClasses === 0) return 100
    const complexityPenalty = (highComplexityClasses / totalClasses) * 30
    const sizePenalty = Math.min(20, (totalLOC / 10000) * 10)
    const dependencyPenalty = Math.min(15, (totalDependencies / totalClasses) * 5)
    return Math.max(0, Math.round(100 - complexityPenalty - sizePenalty - dependencyPenalty))
  }

  const qualityScore = getQualityScore()

  // Helper function to group classes by package
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

  // Helper function to get classes in selected package
  const getClassesInPackage = (packageName) => {
    return packageStructure[packageName]?.classes || []
  }

  // Helper function to get class dependencies
  const getClassDependencies = (className) => {
    const incoming = dependencies.filter(d => d.toClass === className)
    const outgoing = dependencies.filter(d => d.fromClass === className)
    return { incoming, outgoing }
  }

  // Navigation handlers
  const handlePackageClick = async (packageName) => {
    setSelectedPackage(packageName)
    setViewLevel('classes')
    await fetchDiagram('packageClasses', packageName, null)
  }

  const handleClassClick = async (classFullName) => {
    setSelectedClass(classFullName)
    setViewLevel('details')
    await fetchDiagram('classFocus', null, classFullName)
  }

  const handleBreadcrumbClick = (level) => {
    if (level === 'packages') {
      setViewLevel('packages')
      setSelectedPackage(null)
      setSelectedClass(null)
      setCurrentDiagram(packageDiagramBase64)
    } else if (level === 'classes') {
      setViewLevel('classes')
      setSelectedClass(null)
      if (selectedPackage) {
        fetchDiagram('packageClasses', selectedPackage, null)
      }
    }
  }
  
  // Fetch diagram from backend
  const fetchDiagram = async (level, packageName, className) => {
    setLoadingDiagram(true)
    try {
      const userId = localStorage.getItem('userId') || 'anonymous'
      // Try multiple sources for projectPath
      const currentProjectPath = reportData.analysisResults?.projectPath || 
                                 projectPath ||
                                 sessionStorage.getItem('currentProjectPath')
      
      if (!currentProjectPath) {
        console.error('Project path not available')
        setLoadingDiagram(false)
        return
      }
      
      console.log('🔍 Fetching diagram with projectPath:', currentProjectPath)
      
      const params = {
        projectPath: currentProjectPath,
        userId: userId,
        level: level
      }
      
      if (packageName) params.packageName = packageName
      if (className) params.className = className
      
      const response = await api.post('/upload/generate-diagram', null, { params })
      
      if (response.data && response.data.diagramBase64) {
        setCurrentDiagram(response.data.diagramBase64)
      } else {
        console.error('No diagram data in response')
      }
    } catch (error) {
      console.error('Error fetching diagram:', error)
      console.error('Error details:', error.response?.data)
    } finally {
      setLoadingDiagram(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">Visual Architecture Report</h2>
            <p className="text-sm opacity-75">{projectName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? isDarkMode ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                    : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${qualityScore >= 80 ? 'bg-green-100' : qualityScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                      <TrendingUp className={`h-5 w-5 ${qualityScore >= 80 ? 'text-green-600' : qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Quality Score</p>
                      <p className="text-2xl font-bold">{qualityScore}%</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Code className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Total Classes</p>
                      <p className="text-2xl font-bold">{totalClasses}</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Lines of Code</p>
                      <p className="text-2xl font-bold">{totalLOC.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-100">
                      <Network className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Dependencies</p>
                      <p className="text-2xl font-bold">{totalDependencies}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className="text-lg font-semibold mb-4">Project Health</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Average Complexity</span>
                      <span className="font-bold">{avgComplexity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>High Complexity Classes</span>
                      <span className={`font-bold ${highComplexityClasses > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {highComplexityClasses}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Interfaces</span>
                      <span className="font-bold">{interfaces}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Abstract Classes</span>
                      <span className="font-bold">{abstractClasses}</span>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                  <div className="space-y-2">
                    {highComplexityClasses > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Refactor {highComplexityClasses} complex classes</span>
                      </div>
                    )}
                    {totalDependencies > totalClasses * 2 && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">High coupling detected</span>
                      </div>
                    )}
                    {qualityScore >= 80 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Excellent code quality</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Breadcrumb Navigation */}
              <div className={`flex items-center gap-2 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <button
                  onClick={() => handleBreadcrumbClick('packages')}
                  className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                    viewLevel === 'packages'
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Packages</span>
                </button>
                
                {selectedPackage && (
                  <>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                    <button
                      onClick={() => handleBreadcrumbClick('classes')}
                      className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                        viewLevel === 'classes'
                          ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                      }`}
                    >
                      <Package className="h-4 w-4" />
                      <span>{selectedPackage}</span>
                    </button>
                  </>
                )}
                
                {selectedClass && (
                  <>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                    <div className={`flex items-center gap-2 px-3 py-1 rounded ${
                      isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      <Code className="h-4 w-4" />
                      <span>{classes[selectedClass]?.className}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Diagram Display */}
              <div className={`rounded-lg border-2 p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">
                    {viewLevel === 'packages' && '📦 Package Architecture'}
                    {viewLevel === 'classes' && `📋 Classes in ${selectedPackage}`}
                    {viewLevel === 'details' && `🔍 ${classes[selectedClass]?.className} Dependencies`}
                  </h3>
                  {loadingDiagram && (
                    <div className="flex items-center gap-2 text-blue-500">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm">Loading diagram...</span>
                    </div>
                  )}
                </div>
                
                {currentDiagram ? (
                  <div className="text-center">
                    <img 
                      src={`data:image/png;base64,${currentDiagram}`}
                      alt="Architecture Diagram"
                      className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                      style={{ maxHeight: '70vh' }}
                    />
                    
                    {/* Interactive hints */}
                    <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <p className="text-sm">
                        {viewLevel === 'packages' && '👆 Click on a package below to see its classes'}
                        {viewLevel === 'classes' && '👆 Click on a class below to see its dependencies'}
                        {viewLevel === 'details' && '👆 Use breadcrumb navigation to go back'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Diagram not available</p>
                  </div>
                )}
              </div>

              {/* Interactive Package/Class List */}
              {viewLevel === 'packages' && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">📦 Click a package to explore:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(packageStructure).map(([pkgName, pkgData]) => (
                      <button
                        key={pkgName}
                        onClick={() => handlePackageClick(pkgName)}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-105 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
                            : 'bg-white border-gray-200 hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-blue-500" />
                          <h5 className="font-semibold truncate">{pkgName}</h5>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="opacity-75">Classes:</span>
                            <span className="font-bold">{pkgData.classCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-75">LOC:</span>
                            <span className="font-bold">{pkgData.totalLOC}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewLevel === 'classes' && selectedPackage && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">📋 Click a class to see details:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getClassesInPackage(selectedPackage).map((classInfo) => (
                      <button
                        key={classInfo.fullName}
                        onClick={() => handleClassClick(classInfo.fullName)}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-102 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
                            : 'bg-white border-gray-200 hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-5 w-5 text-purple-500" />
                          <h5 className="font-semibold">{classInfo.className}</h5>
                          {classInfo.interface && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">I</span>
                          )}
                        </div>
                        <div className="text-sm flex gap-4">
                          <span>LOC: {classInfo.linesOfCode}</span>
                          <span className={`font-bold ${
                            classInfo.complexity > 15 ? 'text-red-500' :
                            classInfo.complexity > 10 ? 'text-orange-500' : 'text-green-500'
                          }`}>Complexity: {classInfo.complexity}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Class Analysis</h3>
              <div className="grid gap-4">
                {Object.entries(classes).slice(0, 20).map(([fullName, classInfo]) => (
                  <div key={fullName} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{classInfo.className}</h4>
                        <p className="text-sm opacity-75">{classInfo.packageName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs text-white ${getComplexityColor(classInfo.complexity)}`}>
                          Complexity: {classInfo.complexity}
                        </span>
                        {classInfo.interface && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Interface</span>}
                        {classInfo.abstract && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Abstract</span>}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm opacity-75">
                      <span>LOC: {classInfo.linesOfCode}</span>
                      <span>Dependencies: {dependencies.filter(d => d.fromClass === fullName).length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Code Metrics Dashboard */}
              <h3 className="text-2xl font-bold mb-6">📊 Advanced Code Metrics Dashboard</h3>
              
              {analysisResults?.codeMetrics ? (
                <>
                  {/* Technical Debt */}
                  <div className={`p-6 rounded-lg border-2 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Technical Debt Estimation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className="text-sm opacity-75">Total Time</p>
                        <p className="text-2xl font-bold">{analysisResults.codeMetrics.technicalDebt.totalHours.toFixed(1)}h</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className="text-sm opacity-75">In Days</p>
                        <p className="text-2xl font-bold">{analysisResults.codeMetrics.technicalDebt.totalDays.toFixed(1)}d</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className="text-sm opacity-75">Severity</p>
                        <p className={`text-2xl font-bold ${
                          analysisResults.codeMetrics.technicalDebt.severity === 'Low' ? 'text-green-500' :
                          analysisResults.codeMetrics.technicalDebt.severity === 'Moderate' ? 'text-yellow-500' :
                          analysisResults.codeMetrics.technicalDebt.severity === 'High' ? 'text-orange-500' : 'text-red-500'
                        }`}>{analysisResults.codeMetrics.technicalDebt.severity}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className="text-sm opacity-75">Classes Affected</p>
                        <p className="text-2xl font-bold">{Object.keys(analysisResults.codeMetrics.technicalDebt.classDebt || {}).length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Coupling & Cohesion */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <h4 className="text-lg font-semibold mb-4">Coupling Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Avg Afferent Coupling</span>
                          <span className="font-bold">{analysisResults.codeMetrics.couplingMetrics.averageAfferent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Efferent Coupling</span>
                          <span className="font-bold">{analysisResults.codeMetrics.couplingMetrics.averageEfferent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Instability</span>
                          <span className="font-bold">{(analysisResults.codeMetrics.couplingMetrics.averageInstability * 100).toFixed(1)}%</span>
                        </div>
                        <div className={`mt-4 p-3 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                          <p className="text-xs">
                            💡 <strong>Instability</strong>: Measures how stable a class is. Lower is more stable.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <h4 className="text-lg font-semibold mb-4">Maintainability Index</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Average Index</span>
                          <span className="font-bold">{analysisResults.codeMetrics.maintainabilityIndex.averageIndex.toFixed(1)}</span>
                        </div>
                        <div className={`mt-4 p-3 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                          <p className="text-xs">
                            💡 <strong>Maintainability Index</strong>: 0-100 scale. Higher is better.
                            <br/>• 80-100: Excellent
                            <br/>• 60-79: Good
                            <br/>• 40-59: Moderate
                            <br/>• 20-39: Poor
                            <br/>• 0-19: Critical
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complexity Heatmap */}
                  <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h4 className="text-lg font-semibold mb-4">Complexity Heatmap</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(analysisResults.codeMetrics.complexityHeatmap || {}).slice(0, 20).map(([className, level]) => (
                        <div key={className} className={`p-3 rounded text-center ${
                          level === 'LOW' ? 'bg-green-500 text-white' :
                          level === 'MODERATE' ? 'bg-yellow-500 text-white' :
                          level === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          <p className="text-xs font-medium truncate" title={className}>
                            {className.split('.').pop()}
                          </p>
                          <p className="text-xs opacity-75">{level}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Complex Classes */}
                  <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h4 className="text-lg font-semibold mb-4">Top 10 Most Complex Classes</h4>
                    <div className="space-y-2">
                      {(analysisResults.codeMetrics.classMetrics || []).slice(0, 10).map((metric, idx) => (
                        <div key={idx} className={`p-3 rounded flex justify-between items-center ${
                          isDarkMode ? 'bg-gray-700' : 'bg-white'
                        }`}>
                          <div>
                            <p className="font-medium text-sm">{metric.className.split('.').pop()}</p>
                            <p className="text-xs opacity-75">LOC: {metric.linesOfCode} | Coupling: {metric.afferentCoupling + metric.efferentCoupling}</p>
                          </div>
                          <span className={`px-3 py-1 rounded font-bold ${
                            metric.complexity > 40 ? 'bg-red-500 text-white' :
                            metric.complexity > 20 ? 'bg-orange-500 text-white' :
                            metric.complexity > 10 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            {metric.complexity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Code metrics not available</p>
                </div>
              )}
            </div>
          )}

          {/* Design Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-6">🎨 Design Pattern Detection</h3>
              
              {analysisResults?.designPatterns && analysisResults.designPatterns.length > 0 ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-green-900/30 border-2 border-green-700' : 'bg-green-50 border-2 border-green-300'}`}>
                      <p className="text-sm opacity-75">Good Patterns</p>
                      <p className="text-3xl font-bold text-green-600">
                        {analysisResults.designPatterns.filter(p => !p.patternName.includes('Anti-pattern')).length}
                      </p>
                    </div>
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-900/30 border-2 border-red-700' : 'bg-red-50 border-2 border-red-300'}`}>
                      <p className="text-sm opacity-75">Anti-patterns</p>
                      <p className="text-3xl font-bold text-red-600">
                        {analysisResults.designPatterns.filter(p => p.patternName.includes('Anti-pattern')).length}
                      </p>
                    </div>
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border-2 border-blue-700' : 'bg-blue-50 border-2 border-blue-300'}`}>
                      <p className="text-sm opacity-75">Total Detected</p>
                      <p className="text-3xl font-bold text-blue-600">{analysisResults.designPatterns.length}</p>
                    </div>
                  </div>

                  {/* Pattern List */}
                  <div className="space-y-4">
                    {analysisResults.designPatterns.map((pattern, idx) => {
                      const isAntiPattern = pattern.patternName.includes('Anti-pattern')
                      return (
                        <div key={idx} className={`p-6 rounded-lg border-l-4 ${
                          isAntiPattern 
                            ? isDarkMode ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-500'
                            : isDarkMode ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-500'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold">
                                  {isAntiPattern ? '⚠️' : '✅'} {pattern.patternName}
                                </h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  pattern.confidence >= 90 ? 'bg-green-100 text-green-800' :
                                  pattern.confidence >= 75 ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {pattern.confidence}% confidence
                                </span>
                              </div>
                              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {pattern.description}
                              </p>
                              <p className="text-sm font-mono opacity-75">
                                📦 {pattern.className}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pattern Statistics */}
                  <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h4 className="text-lg font-semibold mb-4">Pattern Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        analysisResults.designPatterns.reduce((acc, p) => {
                          const name = p.patternName.replace(' (Anti-pattern)', '')
                          acc[name] = (acc[name] || 0) + 1
                          return acc
                        }, {})
                      ).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center">
                          <span>{name}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No design patterns detected</p>
                  <p className="text-sm opacity-75 mt-2">This could mean your code is simple or patterns are not clearly defined</p>
                </div>
              )}
            </div>
          )}

          {/* Interactive Dependencies Graph Tab */}
          {activeTab === 'dependencies' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-6">🔗 Interactive Dependency Graph</h3>
              
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="mb-4 flex gap-4">
                  <button className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                    Show All
                  </button>
                  <button className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                    Extends Only
                  </button>
                  <button className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                    Implements Only
                  </button>
                  <button className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                    Uses Only
                  </button>
                </div>
                
                <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <Network className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Interactive Graph Visualization</p>
                  <p className="text-sm opacity-75 mb-4">
                    This feature requires a graph visualization library like D3.js or Cytoscape.js
                  </p>
                  <div className="text-left max-w-2xl mx-auto">
                    <p className="text-sm mb-2">Features to implement:</p>
                    <ul className="text-sm space-y-1 opacity-75">
                      <li>• Drag and drop nodes</li>
                      <li>• Click on class to see details</li>
                      <li>• Filter by dependency type</li>
                      <li>• Zoom and pan</li>
                      <li>• Highlight dependency chains</li>
                      <li>• Export as image</li>
                    </ul>
                  </div>
                  
                  {/* Simple text-based dependency view */}
                  <div className="mt-6 text-left">
                    <h5 className="font-semibold mb-3">Dependency List (First 20):</h5>
                    <div className="space-y-1 text-sm font-mono">
                      {dependencies.slice(0, 20).map((dep, idx) => (
                        <div key={idx} className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                          <span className="text-blue-500">{dep.fromClass.split('.').pop()}</span>
                          <span className="mx-2">
                            {dep.type === 'EXTENDS' ? '──▶' : 
                             dep.type === 'IMPLEMENTS' ? '··▶' : '──▷'}
                          </span>
                          <span className="text-green-500">{dep.toClass.split('.').pop()}</span>
                          <span className="ml-2 opacity-50">({dep.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${qualityScore >= 80 ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {qualityScore >= 80 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div>
                      <h4 className="font-semibold">Overall Code Quality</h4>
                      <p className="text-sm opacity-75">
                        {qualityScore >= 80 ? 'Excellent code quality with good structure and maintainability.' :
                         qualityScore >= 60 ? 'Good code quality with some areas for improvement.' :
                         'Code quality needs attention. Consider refactoring complex components.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Network className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Architecture Complexity</h4>
                      <p className="text-sm opacity-75">
                        {totalDependencies > totalClasses * 2 ? 
                          'High coupling detected. Consider reducing dependencies between classes.' :
                          'Well-structured architecture with reasonable coupling levels.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Code className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Maintainability</h4>
                      <p className="text-sm opacity-75">
                        {highComplexityClasses === 0 ? 
                          'All classes have manageable complexity levels.' :
                          `${highComplexityClasses} classes have high complexity and may need refactoring.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}