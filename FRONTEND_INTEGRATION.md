# Frontend Integration Guide - Enhanced PDF Report

## Quick Integration Steps

### Option 1: Add to FileViewer Component

**File**: `JavaSpectorFrontend-main/src/pages/FileViewer.jsx`

Add this button next to existing action buttons:

```jsx
const downloadEnhancedReport = async () => {
  try {
    const response = await fetch(`${API_URL}/api/upload/generate-pdf-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        projectPath: projectPath, // from your component state
        userId: userId // from your auth context
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_Architecture_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert('✅ Enhanced report downloaded successfully!');
    } else {
      alert('❌ Failed to generate report');
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    alert('❌ Error: ' + error.message);
  }
};

// Add button in your JSX
<button
  onClick={downloadEnhancedReport}
  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
>
  📊 Download Enhanced Report
</button>
```

### Option 2: Add to Dashboard Component

**File**: `JavaSpectorFrontend-main/src/pages/Dashboard.jsx`

Add to the ReportsTable actions:

```jsx
// In ReportsTable.jsx or Dashboard.jsx
const handleDownloadEnhanced = async (report) => {
  try {
    const response = await fetch(`${API_URL}/api/upload/generate-pdf-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        projectPath: report.projectPath,
        userId: report.userId
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.projectName}_Architecture_Report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Add button in table row
<button
  onClick={() => handleDownloadEnhanced(report)}
  className="text-purple-600 hover:text-purple-800"
  title="Download Enhanced Report"
>
  📊
</button>
```

### Option 3: Create Reusable Hook

**File**: `JavaSpectorFrontend-main/src/hooks/useEnhancedReport.js` (new file)

```javascript
import { useState } from 'react';

export const useEnhancedReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const downloadReport = async (projectPath, userId, projectName) => {
    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${API_URL}/api/upload/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          projectPath,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_Architecture_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { downloadReport, loading, error };
};
```

**Usage in Component:**

```jsx
import { useEnhancedReport } from '../hooks/useEnhancedReport';

function MyComponent() {
  const { downloadReport, loading, error } = useEnhancedReport();

  const handleDownload = async () => {
    const result = await downloadReport(projectPath, userId, projectName);
    if (result.success) {
      alert('✅ Report downloaded!');
    } else {
      alert('❌ ' + result.error);
    }
  };

  return (
    <button 
      onClick={handleDownload} 
      disabled={loading}
      className="px-4 py-2 bg-purple-600 text-white rounded"
    >
      {loading ? '⏳ Generating...' : '📊 Download Enhanced Report'}
    </button>
  );
}
```

### Option 4: Add to API Service

**File**: `JavaSpectorFrontend-main/src/api/reportApi.js` (new file)

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const reportApi = {
  downloadEnhancedReport: async (projectPath, userId, projectName) => {
    try {
      const response = await fetch(`${API_URL}/api/upload/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          projectPath,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_Architecture_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error downloading enhanced report:', error);
      return { success: false, error: error.message };
    }
  }
};
```

**Usage:**

```jsx
import { reportApi } from '../api/reportApi';

const handleDownload = async () => {
  const result = await reportApi.downloadEnhancedReport(
    projectPath, 
    userId, 
    projectName
  );
  
  if (result.success) {
    alert('✅ Report downloaded successfully!');
  } else {
    alert('❌ Failed: ' + result.error);
  }
};
```

## Complete Example Component

**File**: `JavaSpectorFrontend-main/src/components/EnhancedReportButton.jsx` (new)

```jsx
import React, { useState } from 'react';

export default function EnhancedReportButton({ projectPath, userId, projectName }) {
  const [loading, setLoading] = useState(false);

  const downloadReport = async () => {
    setLoading(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${API_URL}/api/upload/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          projectPath,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_Architecture_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('✅ Enhanced report downloaded successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to download report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadReport}
      disabled={loading}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Generating...</span>
        </>
      ) : (
        <>
          <span>📊</span>
          <span>Download Enhanced Report</span>
        </>
      )}
    </button>
  );
}
```

**Usage:**

```jsx
import EnhancedReportButton from '../components/EnhancedReportButton';

// In your component
<EnhancedReportButton 
  projectPath={report.projectPath}
  userId={currentUser.id}
  projectName={report.projectName}
/>
```

## Styling Options

### Tailwind CSS (Recommended)
```jsx
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors">
  📊 Download Enhanced Report
</button>
```

### Custom CSS
```css
.enhanced-report-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.2s;
}

.enhanced-report-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.enhanced-report-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Testing

### Test in Browser Console
```javascript
fetch('http://localhost:8080/api/upload/generate-pdf-report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    projectPath: 'uploads/YourProject',
    userId: 'testUser'
  })
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test_report.pdf';
  a.click();
});
```

## Environment Variables

Make sure your `.env` file has:

```env
VITE_API_URL=http://localhost:8080
```

For production:
```env
VITE_API_URL=https://your-railway-app.railway.app
```

## Deployment

After adding the button:

```bash
cd JavaSpectorFrontend-main
npm run build
vercel --prod
```

Or if using Vercel auto-deploy:
```bash
git add .
git commit -m "feat: Add enhanced PDF report download button"
git push origin main
```

## Summary

Choose the integration option that best fits your architecture:
- **Option 1**: Quick and simple, directly in component
- **Option 2**: Good for table actions
- **Option 3**: Reusable hook pattern (recommended)
- **Option 4**: Centralized API service (best for large apps)

All options work with the enhanced backend endpoint and will download a comprehensive PDF report with quality metrics, health scores, risk assessment, and cost implications.
