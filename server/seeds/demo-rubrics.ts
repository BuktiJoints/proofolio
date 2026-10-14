import type { z } from "zod";
import type { rubricInput } from "@/server/domain/rubrics";

export const demoRubrics: z.infer<typeof rubricInput>[] = [
  {
    title: "Praktik Keselamatan Kerja Dasar (K3)",
    description: "Rubrik demo untuk menilai penerapan prosedur K3.",
    criteria: [
      {
        code: "APD",
        title: "Menggunakan APD",
        description:
          "Siswa menggunakan alat pelindung diri yang sesuai sebelum praktik.",
        order: 1,
        required: true,
        maxScore: 30,
      },
      {
        code: "AREA",
        title: "Memeriksa area kerja",
        description: "Siswa memastikan area kerja aman dan rapi.",
        order: 2,
        required: true,
        maxScore: 30,
      },
      {
        code: "PROSEDUR",
        title: "Mengikuti prosedur",
        description: "Siswa menjalankan langkah kerja secara urut dan aman.",
        order: 3,
        required: true,
        maxScore: 40,
      },
    ],
  },
  {
    title: "Keterampilan Mengajar (Microteaching)",
    description:
      "Rubrik latihan untuk meninjau praktik mengajar berdasarkan tindakan dan ucapan yang tampak atau terdengar pada video. Bukan standar sertifikasi resmi. Jika bagian pembelajaran tidak terekam, bukti tidak boleh dianggap teramati. Penilaian akhir dilakukan asesor.",
    criteria: [
      {
        code: "OPENING",
        title: "Membuka pembelajaran",
        description:
          "Pengajar menyapa peserta didik, menarik perhatian atau menghubungkan topik dengan pengetahuan sebelumnya, dan memperkenalkan materi yang akan dipelajari. Catat tindakan atau ucapan yang benar-benar terekam.",
        order: 1,
        required: true,
        maxScore: 15,
      },
      {
        code: "OBJECTIVES",
        title: "Menyampaikan tujuan pembelajaran",
        description:
          "Pengajar menyebutkan tujuan, kemampuan, atau hasil belajar yang ingin dicapai. Tujuan harus terdengar atau terlihat secara eksplisit; jangan menyimpulkannya hanya dari judul materi.",
        order: 2,
        required: true,
        maxScore: 10,
      },
      {
        code: "EXPLANATION",
        title: "Menjelaskan materi secara runtut",
        description:
          "Pengajar menjelaskan isi materi dalam urutan yang dapat diikuti dan memberikan contoh, ilustrasi, atau demonstrasi yang berkaitan dengan topik. Bukti memuat bagian penjelasan yang terdengar atau terlihat, bukan asumsi tentang penguasaan seluruh materi.",
        order: 3,
        required: true,
        maxScore: 25,
      },
      {
        code: "INTERACTION",
        title: "Melibatkan peserta didik",
        description:
          "Pengajar mengajukan pertanyaan, mengundang peserta didik bertanya, atau mengajak melakukan aktivitas terkait materi. Bila respons peserta didik terekam, periksa bagaimana pengajar menanggapinya. Jangan mengarang jawaban atau interaksi yang tidak terekam.",
        order: 4,
        required: true,
        maxScore: 20,
      },
      {
        code: "COMMUNICATION",
        title: "Berkomunikasi dan menyajikan materi",
        description:
          "Ucapan pengajar dapat dipahami dan penyampaian dibantu penekanan suara, gerak tubuh, tulisan, atau media yang relevan. Sebutkan unsur yang terekam. Bila audio atau gambar tidak jelas, nyatakan keterbatasan bukti.",
        order: 5,
        required: true,
        maxScore: 15,
      },
      {
        code: "CLOSING",
        title: "Menutup pembelajaran",
        description:
          "Pengajar merangkum pokok materi dan memeriksa pemahaman atau menyampaikan tindak lanjut sebelum mengakhiri pembelajaran. Jika rekaman berakhir sebelum penutupan, jangan menganggap penutupan telah dilakukan.",
        order: 6,
        required: true,
        maxScore: 15,
      },
    ],
  },
];
