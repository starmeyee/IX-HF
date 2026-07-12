const fs = require('fs');
const path = require('path');

const srcPath = '/home/utkarsh/Documents/Mini Apps/X HI Main/src/pages/StarBatchTestPlayerPage.jsx';
const content = fs.readFileSync(srcPath, 'utf-8');
const lines = content.split('\n');

const compStart = lines.findIndex(l => l.startsWith('function TestAnalyticsDashboard'));
const compEnd = lines.findIndex((l, idx) => idx > compStart && l === '}') + 1;

const compLines = lines.slice(compStart, compEnd);
const restLines = [...lines.slice(0, compStart), "import TestAnalyticsDashboard from '../components/TestAnalyticsDashboard';", ...lines.slice(compEnd)];

fs.writeFileSync(srcPath, restLines.join('\n'));

const newComp = `import { useState } from 'react';
import { CheckCircle, XCircle, Sparkles, AlertCircle, BookOpen, Clock, Activity, Flag, Crosshair, ChevronDown, ChevronUp, BarChart2, Target, Zap } from 'lucide-react';

export default ${compLines.join('\n')}
`;

fs.writeFileSync('/home/utkarsh/Documents/Mini Apps/X HI Main/src/components/TestAnalyticsDashboard.jsx', newComp);
