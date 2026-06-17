#!/bin/bash
# Deploy PBL Assessment Feature
# โรงเรียนวรนาถวิทยากำแพงเพชร - ATLAS

set -e

echo "🚀 Deploying PBL Assessment Feature..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Generate Excel Template
echo -e "${BLUE}[1/4]${NC} Generating Excel Template..."
node scripts/generate-pbl-template.mjs
echo ""

# Step 2: Apply Database Migration
echo -e "${BLUE}[2/4]${NC} Applying Database Migration..."
echo -e "${YELLOW}⚠️  This will create 2 new tables:${NC}"
echo "   - pbl_projects"
echo "   - pbl_assessments"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Deployment cancelled"
    exit 1
fi

npx supabase db push
echo ""

# Step 3: Deploy Edge Function
echo -e "${BLUE}[3/4]${NC} Deploying Edge Function: import-pbl..."
npx supabase functions deploy import-pbl
echo ""

# Step 4: Build Frontend
echo -e "${BLUE}[4/4]${NC} Building Frontend..."
npm run build
echo ""

# Success
echo -e "${GREEN}✅ PBL Assessment Feature deployed successfully!${NC}"
echo ""
echo "📋 Summary:"
echo "   ✓ Database tables created (pbl_projects, pbl_assessments)"
echo "   ✓ Edge function deployed (import-pbl)"
echo "   ✓ Frontend built with PBLDashboard component"
echo "   ✓ Excel template generated (public/PBL_Import_Template.xlsx)"
echo ""
echo "🔗 Access:"
echo "   - Dashboard: https://your-domain.com/pbl"
echo "   - Template: public/PBL_Import_Template.xlsx"
echo ""
echo "📚 Documentation:"
echo "   - docs/PBL_ASSESSMENT_FEATURE.md"
echo "   - public/PBL_Import_Template.md"
echo ""
echo "🎯 Next Steps:"
echo "   1. Download template: public/PBL_Import_Template.xlsx"
echo "   2. Fill in student data"
echo "   3. Upload via /pbl dashboard"
echo "   4. View analytics and reports"
echo ""
