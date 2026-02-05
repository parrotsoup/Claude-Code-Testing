#!/bin/bash
# GDS Holdings Investor Relations PDF Downloader
# Source: https://investors.gds-services.com/
#
# This script downloads all available investor relations PDFs from GDS Holdings
# Run this script locally with internet access to download the files

set -e

# Create directories
mkdir -p gds-investor-pdfs/{earnings,annual-reports,esg-reports,sec-filings,agm}

echo "=== Downloading GDS Holdings Investor Relations PDFs ==="
echo ""

# Function to download with error handling
download_pdf() {
    local url="$1"
    local output="$2"
    echo "Downloading: $output"
    if curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
         -H "Accept: application/pdf,*/*" \
         -o "$output" "$url" 2>/dev/null; then
        # Check if the file is a valid PDF
        if head -c 4 "$output" | grep -q "%PDF"; then
            echo "  ✓ Success"
        else
            echo "  ✗ Failed (not a PDF)"
            rm -f "$output"
        fi
    else
        echo "  ✗ Failed to download"
        rm -f "$output"
    fi
}

echo "=== EARNINGS PRESENTATIONS & TRANSCRIPTS ==="
echo ""

# 2025 Earnings Materials
download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/11/19/6-09-36/GDS%203Q25%20Earnings%20Release.pdf" \
    "gds-investor-pdfs/earnings/GDS_3Q25_Earnings_Release.pdf"

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/08/21/0-50-21/GDS%202Q25%20Earnings%20Transcript.pdf" \
    "gds-investor-pdfs/earnings/GDS_2Q25_Earnings_Transcript.pdf"

download_pdf \
    "https://investors.gds-services.com/static-files/13404e85-48eb-468b-af85-192ebc7ca5ce" \
    "gds-investor-pdfs/earnings/GDS_1Q25_Earnings_Presentation.pdf"

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/05/21/0-43-38/GDS%201Q25%20Earnings%20Transcript.pdf" \
    "gds-investor-pdfs/earnings/GDS_1Q25_Earnings_Transcript.pdf"

# 2024 Earnings Materials
download_pdf \
    "https://investors.gds-services.com/static-files/f812795d-b20c-4ffc-a105-7f0a07766a58" \
    "gds-investor-pdfs/earnings/GDS_4Q24_FY24_Earnings_Presentation.pdf"

download_pdf \
    "https://investors.gds-services.com/static-files/ba010f1e-ac77-4b4d-85ab-37133ae76754" \
    "gds-investor-pdfs/earnings/GDS_4Q24_Earnings_Transcript.pdf"

download_pdf \
    "https://investors.gds-services.com/static-files/9d57b604-3a55-49bf-8be7-f95fb77dd614" \
    "gds-investor-pdfs/earnings/GDS_4Q24_FY24_Results.pdf"

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2024/08/21/6-53-36/GDS%202Q24%20Earnings%20Presentation.pdf" \
    "gds-investor-pdfs/earnings/GDS_2Q24_Earnings_Presentation.pdf"

# 2023 Earnings Materials
download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2024/05/21/22-49-07/GDS%204Q23%26FY23%20Earnings%20Presentation%2024.03.26%20FINAL%202000.pdf" \
    "gds-investor-pdfs/earnings/GDS_4Q23_FY23_Earnings_Presentation.pdf"

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/08/22/6-23-45/GDS%202Q23%20Earnings%20Presentation.pdf" \
    "gds-investor-pdfs/earnings/GDS_2Q23_Earnings_Presentation.pdf"

# 2022 Earnings Materials
download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/03/16/4-56-42/GDS%204Q%26FY22%20Earnings%20Presentation.pdf" \
    "gds-investor-pdfs/earnings/GDS_4Q22_FY22_Earnings_Presentation.pdf"

echo ""
echo "=== ANNUAL REPORTS (Form 20-F) ==="
echo ""

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/04/04/8-32-18/GDS%202022%2020F.pdf" \
    "gds-investor-pdfs/annual-reports/GDS_2022_20F.pdf"

echo ""
echo "=== AGM (Annual General Meeting) MATERIALS ==="
echo ""

download_pdf \
    "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/06/04/9-27-06/GDS%20AGM%202025%20for%20IR%20Website-EN-v2.pdf" \
    "gds-investor-pdfs/agm/GDS_AGM_2025.pdf"

echo ""
echo "=== ESG REPORTS ==="
echo ""

download_pdf \
    "https://c.gds-services.com/esg2024/docs/2024_ESG_Report_EN.pdf" \
    "gds-investor-pdfs/esg-reports/GDS_2024_ESG_Report.pdf"

echo ""
echo "=== SEC FILINGS (from sec.gov) ==="
echo ""

download_pdf \
    "https://www.sec.gov/Archives/edgar/data/1526125/000110465923104905/tm2327040d1_ex99-1.pdf" \
    "gds-investor-pdfs/sec-filings/GDS_Ex99-1_2023_Investor_Presentation.pdf"

download_pdf \
    "https://www.sec.gov/Archives/edgar/data/1526125/000110465925040007/tm2513338d1_ex99-2.pdf" \
    "gds-investor-pdfs/sec-filings/GDS_Ex99-2_2025.pdf"

echo ""
echo "=== DOWNLOAD COMPLETE ==="
echo ""
echo "Files downloaded to: gds-investor-pdfs/"
echo ""
ls -la gds-investor-pdfs/*/
