from PIL import Image, ImageDraw
img = Image.new('RGB', (512, 512), (200, 220, 240))
d = ImageDraw.Draw(img)
# sky
d.rectangle([0,0,512,250], fill=(135,206,235))
# ground
d.rectangle([0,300,512,512], fill=(34,139,34))
# road
d.rectangle([0,340,512,430], fill=(80,80,80))
# car body
d.rounded_rectangle([80,250,380,340], radius=20, fill=(255,0,0))
# roof
d.rounded_rectangle([140,200,310,255], radius=15, fill=(200,0,0))
# windows
d.rectangle([160,210,220,250], fill=(200,230,255))
d.rectangle([230,210,290,250], fill=(200,230,255))
# wheels
d.ellipse([110,330,180,400], fill=(20,20,20))
d.ellipse([280,330,350,400], fill=(20,20,20))
d.ellipse([130,350,160,380], fill=(160,160,160))
d.ellipse([300,350,330,380], fill=(160,160,160))
# text label
try:
    d.text((160,120), "A CAR", fill=(0,0,0))
except Exception:
    pass
img.save('test_car.png')
print('saved test_car.png')
