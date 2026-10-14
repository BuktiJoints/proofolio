const spec = {
  openapi: "3.1.0", info: { title: "BuktiPraktik API", version: "1.0.0", description: "Backend penilaian praktik berbantuan AI. AI hanya memberi bukti; keputusan akhir selalu milik asesor." },
  servers: [{ url: "/" }], tags: [{ name: "Auth" }, { name: "Profile" }, { name: "Rubrics" }, { name: "Submissions" }, { name: "Reviews" }, { name: "Portfolio" }],
  paths: {
    "/api/auth/sign-up/email": { post: { tags: ["Auth"], summary: "Daftar siswa" } }, "/api/auth/sign-in/email": { post: { tags: ["Auth"], summary: "Masuk" } }, "/api/auth/get-session": { get: { tags: ["Auth"], summary: "Ambil sesi" } },
    "/api/v1/me": { get: { tags: ["Profile"], summary: "Profil pengguna" } }, "/api/v1/me/profile": { patch: { tags: ["Profile"], summary: "Lengkapi profil siswa" } },
    "/api/v1/rubrics": { get: { tags: ["Rubrics"], summary: "Daftar rubrik" }, post: { tags: ["Rubrics"], summary: "Buat rubrik (asesor)" } },
    "/api/v1/rubrics/{id}": { get: { tags: ["Rubrics"], summary: "Detail rubrik", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }] } },
    "/api/v1/submissions": { get: { tags: ["Submissions"], summary: "Daftar pengumpulan" }, post: { tags: ["Submissions"], summary: "Unggah video", requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["rubricVersionId", "video"], properties: { rubricVersionId: { type: "string", format: "uuid" }, video: { type: "string", format: "binary" } } } } } } } },
    "/api/v1/submissions/{id}/review/start": { post: { tags: ["Reviews"], summary: "Klaim review" } }, "/api/v1/submissions/{id}/review/finalize": { post: { tags: ["Reviews"], summary: "Finalisasi keputusan asesor" } },
    "/api/v1/portfolio": { get: { tags: ["Portfolio"], summary: "Portofolio siswa" } }, "/api/public/evidence/{token}": { get: { tags: ["Portfolio"], summary: "Bukti publik" } },
  },
};
export const GET = () => Response.json(spec, { headers: { "Cache-Control": "public, max-age=3600" } });
