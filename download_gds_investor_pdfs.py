#!/usr/bin/env python3
"""
GDS Holdings Investor Relations PDF Downloader
Source: https://investors.gds-services.com/

This script downloads all available investor relations PDFs from GDS Holdings.
Run this script locally with internet access to download the files.
"""

import os
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# PDF URLs organized by category
PDF_DOWNLOADS = {
    "earnings": [
        # 2025 Earnings Materials
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/11/19/6-09-36/GDS%203Q25%20Earnings%20Release.pdf",
            "filename": "GDS_3Q25_Earnings_Release.pdf"
        },
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/08/21/0-50-21/GDS%202Q25%20Earnings%20Transcript.pdf",
            "filename": "GDS_2Q25_Earnings_Transcript.pdf"
        },
        {
            "url": "https://investors.gds-services.com/static-files/13404e85-48eb-468b-af85-192ebc7ca5ce",
            "filename": "GDS_1Q25_Earnings_Presentation.pdf"
        },
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/05/21/0-43-38/GDS%201Q25%20Earnings%20Transcript.pdf",
            "filename": "GDS_1Q25_Earnings_Transcript.pdf"
        },
        # 2024 Earnings Materials
        {
            "url": "https://investors.gds-services.com/static-files/f812795d-b20c-4ffc-a105-7f0a07766a58",
            "filename": "GDS_4Q24_FY24_Earnings_Presentation.pdf"
        },
        {
            "url": "https://investors.gds-services.com/static-files/ba010f1e-ac77-4b4d-85ab-37133ae76754",
            "filename": "GDS_4Q24_Earnings_Transcript.pdf"
        },
        {
            "url": "https://investors.gds-services.com/static-files/9d57b604-3a55-49bf-8be7-f95fb77dd614",
            "filename": "GDS_4Q24_FY24_Results.pdf"
        },
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2024/08/21/6-53-36/GDS%202Q24%20Earnings%20Presentation.pdf",
            "filename": "GDS_2Q24_Earnings_Presentation.pdf"
        },
        # 2023 Earnings Materials
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2024/05/21/22-49-07/GDS%204Q23%26FY23%20Earnings%20Presentation%2024.03.26%20FINAL%202000.pdf",
            "filename": "GDS_4Q23_FY23_Earnings_Presentation.pdf"
        },
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/08/22/6-23-45/GDS%202Q23%20Earnings%20Presentation.pdf",
            "filename": "GDS_2Q23_Earnings_Presentation.pdf"
        },
        # 2022 Earnings Materials
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/03/16/4-56-42/GDS%204Q%26FY22%20Earnings%20Presentation.pdf",
            "filename": "GDS_4Q22_FY22_Earnings_Presentation.pdf"
        },
    ],
    "annual-reports": [
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2023/04/04/8-32-18/GDS%202022%2020F.pdf",
            "filename": "GDS_2022_20F.pdf"
        },
    ],
    "agm": [
        {
            "url": "https://investors.gds-services.com/system/files-encrypted/nasdaq_kms/assets/2025/06/04/9-27-06/GDS%20AGM%202025%20for%20IR%20Website-EN-v2.pdf",
            "filename": "GDS_AGM_2025.pdf"
        },
    ],
    "esg-reports": [
        {
            "url": "https://c.gds-services.com/esg2024/docs/2024_ESG_Report_EN.pdf",
            "filename": "GDS_2024_ESG_Report.pdf"
        },
    ],
    "sec-filings": [
        {
            "url": "https://www.sec.gov/Archives/edgar/data/1526125/000110465923104905/tm2327040d1_ex99-1.pdf",
            "filename": "GDS_Ex99-1_2023_Investor_Presentation.pdf"
        },
        {
            "url": "https://www.sec.gov/Archives/edgar/data/1526125/000110465925040007/tm2513338d1_ex99-2.pdf",
            "filename": "GDS_Ex99-2_2025.pdf"
        },
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*",
}


def download_pdf(url: str, output_path: Path) -> tuple[str, bool, str]:
    """Download a PDF file from the given URL."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=60, allow_redirects=True)
        response.raise_for_status()

        # Check if the content is a valid PDF
        if not response.content[:4] == b"%PDF":
            return str(output_path), False, "Not a valid PDF"

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(response.content)
        return str(output_path), True, f"Downloaded ({len(response.content) / 1024:.1f} KB)"

    except requests.exceptions.RequestException as e:
        return str(output_path), False, str(e)


def main():
    base_dir = Path("gds-investor-pdfs")

    print("=" * 60)
    print("GDS Holdings Investor Relations PDF Downloader")
    print("Source: https://investors.gds-services.com/")
    print("=" * 60)
    print()

    # Build list of all downloads
    all_downloads = []
    for category, pdfs in PDF_DOWNLOADS.items():
        category_dir = base_dir / category
        for pdf in pdfs:
            output_path = category_dir / pdf["filename"]
            all_downloads.append((pdf["url"], output_path, category))

    print(f"Downloading {len(all_downloads)} PDFs...")
    print()

    success_count = 0
    fail_count = 0

    # Download PDFs concurrently
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(download_pdf, url, path): (url, path, cat)
            for url, path, cat in all_downloads
        }

        current_category = None
        results_by_category = {}

        for future in as_completed(futures):
            url, path, category = futures[future]
            filepath, success, message = future.result()

            if category not in results_by_category:
                results_by_category[category] = []
            results_by_category[category].append((filepath, success, message))

    # Print results organized by category
    for category in PDF_DOWNLOADS.keys():
        print(f"=== {category.upper().replace('-', ' ')} ===")
        if category in results_by_category:
            for filepath, success, message in results_by_category[category]:
                filename = Path(filepath).name
                if success:
                    print(f"  [OK] {filename} - {message}")
                    success_count += 1
                else:
                    print(f"  [FAIL] {filename} - {message}")
                    fail_count += 1
        print()

    print("=" * 60)
    print(f"Download complete: {success_count} succeeded, {fail_count} failed")
    print(f"Files saved to: {base_dir.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
