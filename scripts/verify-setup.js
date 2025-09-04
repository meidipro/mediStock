#!/usr/bin/env node

// MediStock App Verification Script
// This script verifies that all critical components are properly configured

const fs = require('fs');
const path = require('path');

console.log('🔍 MediStock App Verification\n');

const checks = [
  {
    name: 'TypeScript Configuration',
    check: () => {
      const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
      if (!fs.existsSync(tsConfigPath)) return { success: false, message: 'tsconfig.json not found' };
      
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      const hasPathMapping = tsConfig.compilerOptions && tsConfig.compilerOptions.paths && tsConfig.compilerOptions.paths['@/*'];
      
      return {
        success: hasPathMapping,
        message: hasPathMapping ? 'Path mapping configured' : 'Path mapping missing'
      };
    }
  },
  {
    name: 'IconSymbol Mappings',
    check: () => {
      const iconPath = path.join(process.cwd(), 'components', 'ui', 'IconSymbol.tsx');
      if (!fs.existsSync(iconPath)) return { success: false, message: 'IconSymbol.tsx not found' };
      
      const iconContent = fs.readFileSync(iconPath, 'utf8');
      const mappingCount = (iconContent.match(/'[^']+'/g) || []).length;
      
      return {
        success: mappingCount > 20,
        message: `${mappingCount} icon mappings found`
      };
    }
  },
  {
    name: 'Error Boundary',
    check: () => {
      const errorBoundaryPath = path.join(process.cwd(), 'components', 'ui', 'ErrorBoundary.tsx');
      const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');
      
      if (!fs.existsSync(errorBoundaryPath)) return { success: false, message: 'ErrorBoundary.tsx not found' };
      if (!fs.existsSync(layoutPath)) return { success: false, message: '_layout.tsx not found' };
      
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      const hasErrorBoundary = layoutContent.includes('ErrorBoundary');
      
      return {
        success: hasErrorBoundary,
        message: hasErrorBoundary ? 'Error boundary integrated' : 'Error boundary not integrated'
      };
    }
  },
  {
    name: 'Performance Hooks',
    check: () => {
      const perfHooksPath = path.join(process.cwd(), 'hooks', 'usePerformance.ts');
      if (!fs.existsSync(perfHooksPath)) return { success: false, message: 'usePerformance.ts not found' };
      
      const perfContent = fs.readFileSync(perfHooksPath, 'utf8');
      const hookCount = (perfContent.match(/export function use/g) || []).length;
      
      return {
        success: hookCount >= 5,
        message: `${hookCount} performance hooks available`
      };
    }
  },
  {
    name: 'Database Schemas',
    check: () => {
      const purchaseSchemaPath = path.join(process.cwd(), 'purchase-integration-final.sql');
      const barcodeSchemaPath = path.join(process.cwd(), 'barcode-enhanced-schema.sql');
      
      const hasPurchaseSchema = fs.existsSync(purchaseSchemaPath);
      const hasBarcodeSchema = fs.existsSync(barcodeSchemaPath);
      
      return {
        success: hasPurchaseSchema && hasBarcodeSchema,
        message: `Purchase: ${hasPurchaseSchema ? '✓' : '✗'}, Barcode: ${hasBarcodeSchema ? '✓' : '✗'}`
      };
    }
  },
  {
    name: 'Environment Configuration',
    check: () => {
      const envPath = path.join(process.cwd(), '.env');
      const envExists = fs.existsSync(envPath);
      
      if (!envExists) {
        return { 
          success: false, 
          message: '.env file not found - create one with your API keys' 
        };
      }
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasSupabaseKeys = envContent.includes('EXPO_PUBLIC_SUPABASE_URL') && 
                             envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY');
      
      return {
        success: hasSupabaseKeys,
        message: hasSupabaseKeys ? 'Supabase keys configured' : 'Supabase keys missing'
      };
    }
  },
  {
    name: 'Critical App Files',
    check: () => {
      const criticalFiles = [
        'app/_layout.tsx',
        'app/(tabs)/index.tsx',
        'app/(tabs)/inventory.tsx',
        'components/Auth.tsx',
        'contexts/AuthContext.tsx',
        'lib/supabase.js',
        'hooks/useDatabase.ts'
      ];
      
      const missingFiles = criticalFiles.filter(file => 
        !fs.existsSync(path.join(process.cwd(), file))
      );
      
      return {
        success: missingFiles.length === 0,
        message: missingFiles.length === 0 ? 'All critical files present' : `Missing: ${missingFiles.join(', ')}`
      };
    }
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const result = check.check();
  const status = result.success ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${check.name}: ${result.message}`);
  
  if (!result.success) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Your MediStock app is ready for development.');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your .env file with proper API keys');
  console.log('2. Run the database schemas in Supabase SQL Editor');
  console.log('3. Start the development server: npm start');
  console.log('4. Test the app functionality');
} else {
  console.log('⚠️  Some checks failed. Please review the issues above.');
  console.log('\n💡 Common fixes:');
  console.log('• Ensure you\'re in the correct project directory');
  console.log('• Run the setup scripts if any files are missing');
  console.log('• Check the database schema installation');
}

console.log('\n📚 For more help, check the documentation files in your project.');