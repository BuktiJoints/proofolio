# Design system SkillFolio

Sumber: [Figma — Design System](https://www.figma.com/design/k3vHSIKgjgckxhYxXtEHbI/SkillFolio?node-id=4004-3).
Token berada di `app/globals.css`. Font disediakan lokal melalui Fontsource dan
`next/font/local`, sehingga build dan browser tidak menghubungi Google Fonts.

## Warna

Tersedia `primary`, `secondary`, `tertiary`, `neutral`, `red`, `yellow`, dan
`green`, masing-masing tingkat `10, 20, …, 100`, sesuai variabel Figma.
Contoh: `bg-primary-20`, `text-secondary-30`, `border-neutral-40`,
`ring-primary-60/30`. Warna dasar: primary 70, secondary 50, tertiary 30,
red 70. Nomor warna selalu menunjuk hex yang sama, termasuk pada mode gelap.

Alias semantik shadcn (`bg-primary`, `bg-background`, `text-muted-foreground`,
`border-input`, dll.) tetap tersedia. Mode gelap adalah fallback semantik;
Figma saat implementasi hanya mendefinisikan tema terang.

## Typography

| Kelas | Font | Weight | Ukuran / line height (px) |
| --- | --- | --- | --- |
| `text-h1` … `text-h9` | Sora | 700 | 60/60, 48/48, 36/40, 30/36, 24/32, 20/28, 16/24, 14/20, 12/16 |
| `text-s1` … `text-s10` | Poppins | 600 | Sama seperti heading, ditambah 10/12 |
| `text-sh1` … `text-sh10` | Poppins | 600 | Alias `text-s*`, mengikuti nama SH di Figma |
| `text-b1` … `text-b10` | Poppins | 400 | Sama seperti subheading |

Setiap kelas sudah mencakup family, size, weight, line height, dan letter spacing 0.
Contoh responsif: `text-h5 md:text-h3`, `text-b8 md:text-b7`.
Panduan font dan text styles lokal terbaru menjadi acuan. Instance lama yang
masih menyebut Nunito diseragamkan menjadi Poppins.

Gunakan kelas lengkap dalam source, misalnya `bg-primary-20`. Jangan membentuk
nama kelas dinamis seperti `bg-${color}-${level}` tanpa pemetaan kelas statis,
karena Tailwind tidak dapat menemukan kelas tersebut saat build.
