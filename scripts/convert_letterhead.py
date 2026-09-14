import fitz
import base64
import os

pdf_path = r"C:\Users\fishe\.gemini\antigravity\brain\e451d0ea-5650-4be0-ac3f-fb3f116b28c2\.user_uploaded\media_1788097704970.pdf"
doc = fitz.open(pdf_path)
page = doc[0]

# Render at 4.5x zoom (~325 DPI, razor sharp for print/PDF)
zoom = 4.5
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat, alpha=False)

output_png = r"c:\Piyush\startups\Freelancing\Devanshi\Siddhi Vinayak CRM\svil-crm\public\quotation_letterhead_bg.png"
pix.save(output_png)
print(f"Saved PNG: {pix.width}x{pix.height}, {os.path.getsize(output_png)} bytes")

with open(output_png, "rb") as f:
    b64_data = base64.b64encode(f.read()).decode("ascii")

ts_content = f'export const LETTERHEAD_BASE64 = "data:image/png;base64,{b64_data}";\n'

ts_path = r"c:\Piyush\startups\Freelancing\Devanshi\Siddhi Vinayak CRM\svil-crm\lib\letterheadBase64.ts"
with open(ts_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Updated {ts_path} successfully!")
