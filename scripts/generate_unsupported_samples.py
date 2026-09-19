from PIL import Image, ImageDraw
import os


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def generate_unrelated_images(output_dir):
    ensure_dir(output_dir)

    img1 = Image.new('RGB', (800, 600), color='#87CEEB')
    draw1 = ImageDraw.Draw(img1)

    draw1.ellipse([200, 200, 600, 500], fill='#FF8C00')
    draw1.polygon([200, 200, 250, 100, 300, 200], fill='#FF8C00')
    draw1.polygon([500, 200, 550, 100, 600, 200], fill='#FF8C00')
    draw1.ellipse([300, 300, 500, 450], fill='#FFA500')
    draw1.ellipse([350, 350, 380, 380], fill='#000000')
    draw1.ellipse([420, 350, 450, 380], fill='#000000')
    draw1.ellipse([380, 400, 420, 430], fill='#FF69B4')

    img1.save(os.path.join(output_dir, 'unrelated1.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/unrelated1.jpg")

    img2 = Image.new('RGB', (800, 600), color='#90EE90')
    draw2 = ImageDraw.Draw(img2)

    draw2.rectangle([150, 250, 650, 400], fill='#4169E1')
    draw2.polygon([250, 250, 300, 150, 500, 150, 550, 250], fill='#4169E1')
    draw2.ellipse([200, 380, 280, 460], fill='#333333')
    draw2.ellipse([520, 380, 600, 460], fill='#333333')
    draw2.rectangle([270, 170, 330, 240], fill='#ADD8E6')
    draw2.rectangle([470, 170, 530, 240], fill='#ADD8E6')

    img2.save(os.path.join(output_dir, 'unrelated2.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/unrelated2.jpg")


def generate_blank_sky_images(output_dir):
    ensure_dir(output_dir)

    img1 = Image.new('RGB', (800, 600), color='#1E90FF')
    pixels = img1.load()
    for y in range(600):
        shade = int(255 * (y / 600) * 0.1)
        for x in range(800):
            r, g, b = pixels[x, y]
            pixels[x, y] = (min(255, r + shade), min(255, g + shade), min(255, b + shade))

    img1.save(os.path.join(output_dir, 'blank_sky1.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/blank_sky1.jpg")

    img2 = Image.new('RGB', (800, 600), color='#F5F5F5')
    pixels = img2.load()
    for y in range(600):
        for x in range(800):
            noise = (x + y) % 3
            r, g, b = pixels[x, y]
            pixels[x, y] = (max(0, r - noise), max(0, g - noise), max(0, b - noise))

    img2.save(os.path.join(output_dir, 'blank_sky2.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/blank_sky2.jpg")


def generate_repeating_pattern_images(output_dir):
    ensure_dir(output_dir)

    def create_brick_pattern(width, height, base_color, mortar_color):
        img = Image.new('RGB', (width, height), color=mortar_color)
        draw = ImageDraw.Draw(img)

        brick_width = 100
        brick_height = 40
        mortar_size = 4

        for row in range(0, height, brick_height + mortar_size):
            offset = (brick_width // 2) if (row // (brick_height + mortar_size)) % 2 == 1 else 0
            for col in range(-brick_width, width, brick_width + mortar_size):
                x = col + offset
                y = row
                if x + brick_width > 0 and x < width:
                    draw.rectangle(
                        [x, y, x + brick_width, y + brick_height],
                        fill=base_color,
                        outline=mortar_color,
                        width=mortar_size,
                    )

        return img

    img1 = create_brick_pattern(800, 600, '#8B4513', '#D3D3D3')
    img1.save(os.path.join(output_dir, 'repeating1.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/repeating1.jpg")

    img2 = create_brick_pattern(800, 600, '#8B4513', '#D3D3D3')
    img2 = img2.crop((20, 0, 820, 600))
    img2 = img2.resize((800, 600))
    img2.save(os.path.join(output_dir, 'repeating2.jpg'), 'JPEG', quality=95)
    print(f"Generated: {output_dir}/repeating2.jpg")


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    base_dir = os.path.join(repo_root, 'frontend', 'public', 'sample_images')

    print("Generating unsupported sample images...")

    print("\n1. Generating unrelated images...")
    generate_unrelated_images(os.path.join(base_dir, 'unrelated'))

    print("\n2. Generating blank sky images...")
    generate_blank_sky_images(os.path.join(base_dir, 'blank_sky'))

    print("\n3. Generating repeating pattern images...")
    generate_repeating_pattern_images(os.path.join(base_dir, 'repeating'))

    print("\n✅ All unsupported sample images generated successfully!")


if __name__ == '__main__':
    main()
