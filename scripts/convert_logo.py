from PIL import Image
import base64
import os

img_path = r"C:\Users\fishe\.gemini\antigravity\brain\e451d0ea-5650-4be0-ac3f-fb3f116b28c2\.user_uploaded\media_1788098068885.png"
im = Image.open(img_path)

# Check bounding box
bbox = im.getbbox()
print("Bounding box:", bbox, "Original size:", im.size)

if bbox:
    cropped = im.crop(bbox)
else:
    cropped = im

out_png = r"c:\Piyush\startups\Freelancing\Devanshi\Siddhi Vinayak CRM\svil-crm\public\svil_logo.png"
cropped.save(out_png, "PNG")
print(f"Saved cropped logo: {cropped.size}, File size: {os.path.getsize(out_png)}")

with open(out_png, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

ts_content = f'export const SVIL_LOGO_BASE64 = "data:image/png;base64,{b64}";\n'
with open(r"c:\Piyush\startups\Freelancing\Devanshi\Siddhi Vinayak CRM\svil-crm\lib\logoBase64.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Updated lib/logoBase64.ts successfully!")
