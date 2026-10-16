type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({
  $ref: `#/components/schemas/${name}`,
});
const envelope = (schema: Schema): Schema => ({
  type: "object",
  required: ["data"],
  properties: { data: schema },
});
const array = (schema: Schema): Schema => ({ type: "array", items: schema });
const str = { type: "string" };
const uuid = { type: "string", format: "uuid" };
const time = { type: ["string", "null"], format: "date-time" };
const idParameter = { name: "id", in: "path", required: true, schema: uuid };
const tokenParameter = {
  name: "token",
  in: "path",
  required: true,
  schema: str,
};
const body = (schema: Schema) => ({
  required: true,
  content: { "application/json": { schema } },
});
const response = (description: string, schema: Schema) => ({
  description,
  content: { "application/json": { schema } },
});
const errors = Object.fromEntries(
  [400, 401, 403, 404, 409, 413, 415, 429, 503].map((status) => [
    status,
    response("Error aman dengan requestId", ref("Error")),
  ]),
);
function operation(
  summary: string,
  schema: Schema,
  extra: Record<string, unknown> = {},
  status = 200,
) {
  return {
    summary,
    security: [{ cookieSession: [] }],
    responses: { ...errors, [status]: response("Berhasil", schema) },
    ...extra,
  };
}
const statusEnum = [
  "QUEUED",
  "ANALYZING",
  "ANALYSIS_FAILED",
  "AWAITING_REVIEW",
  "IN_REVIEW",
  "COMPLETED",
];
const rubricSchema: Schema = {
  type: "object",
  required: ["id", "title", "status", "activeVersionId"],
  properties: {
    id: uuid,
    title: str,
    description: { type: ["string", "null"] },
    programKeahlian: { type: ["string", "null"] },
    partnerName: { type: ["string", "null"] },
    requirements: { type: ["string", "null"] },
    criterionCount: { type: "integer" },
    followed: { type: "boolean" },
    status: { enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
    activeVersionId: { type: ["string", "null"], format: "uuid" },
    partner: {
      type: "object",
      properties: { id: uuid, name: str },
    },
    versions: array(ref("RubricVersion")),
  },
};
export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "BuktiPraktik API",
    version: "1.4.0",
    description:
      "AI menghasilkan calon bukti dan draft rubrik. Penilaian akhir dan penerbitan rubrik tetap dilakukan asesor.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      cookieSession: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Cookie Better Auth; production HTTPS dapat memakai prefiks __Secure-.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: str,
              message: str,
              requestId: uuid,
              fields: {},
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: uuid,
          name: str,
          email: { type: "string", format: "email" },
          role: { enum: ["STUDENT", "ASSESSOR"] },
          organizationId: uuid,
          accessStatus: { enum: ["ACTIVE", "PENDING", "REJECTED"] },
          image: { type: ["string", "null"], format: "uri" },
        },
      },
      Profile: {
        type: ["object", "null"],
        properties: {
          nisn: { type: ["string", "null"], pattern: "^[0-9]{10}$" },
          phone: { type: ["string", "null"] },
          schoolName: { type: ["string", "null"] },
          programKeahlian: { type: ["string", "null"] },
          notificationStatusEnabled: { type: "boolean" },
          notificationResultEnabled: { type: "boolean" },
        },
      },
      CriterionInput: {
        type: "object",
        required: [
          "code",
          "title",
          "description",
          "order",
          "required",
          "maxScore",
        ],
        properties: {
          code: { type: "string", minLength: 1, maxLength: 40 },
          title: { type: "string", minLength: 2, maxLength: 180 },
          description: { type: "string", minLength: 2, maxLength: 2000 },
          order: { type: "integer", minimum: 0 },
          required: { type: "boolean" },
          maxScore: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      Criterion: {
        allOf: [
          ref("CriterionInput"),
          { type: "object", properties: { id: uuid } },
        ],
      },
      RubricInput: {
        type: "object",
        required: ["title", "criteria"],
        properties: {
          title: { type: "string", minLength: 2, maxLength: 180 },
          description: { type: ["string", "null"], maxLength: 4000 },
          programKeahlian: { type: ["string", "null"], maxLength: 180 },
          partnerName: { type: ["string", "null"], maxLength: 180 },
          requirements: { type: ["string", "null"], maxLength: 4000 },
          criteria: {
            ...array(ref("CriterionInput")),
            minItems: 1,
            maxItems: 30,
          },
        },
      },
      Rubric: {
        ...rubricSchema,
        properties: {
          ...(rubricSchema.properties as Schema),
          version: ref("RubricVersion"),
        },
      },
      RubricVersion: {
        type: "object",
        properties: {
          id: uuid,
          version: { type: "integer" },
          title: str,
          description: { type: ["string", "null"] },
          programKeahlian: { type: ["string", "null"] },
          partnerName: { type: ["string", "null"] },
          requirements: { type: ["string", "null"] },
          publishedAt: time,
          criteria: array(ref("Criterion")),
        },
      },
      Submission: {
        type: "object",
        properties: {
          id: uuid,
          status: { enum: statusEnum },
          rubricVersionId: uuid,
          rubricTitle: str,
          studentId: str,
          studentName: str,
          portfolioIncluded: { type: "boolean" },
          originalFilename: str,
          durationMs: { type: "integer" },
          normalizedScore: { type: ["string", "null"] },
          createdAt: time,
          completedAt: time,
        },
      },
      Evidence: {
        type: "object",
        properties: {
          criterionId: uuid,
          status: { enum: ["OBSERVED", "NOT_OBSERVED", "UNCERTAIN"] },
          startMs: { type: ["integer", "null"], minimum: 0 },
          endMs: { type: ["integer", "null"], minimum: 0 },
          evidence: str,
          quality: { enum: ["CLEAR", "PARTIAL", "OCCLUDED"] },
        },
      },
      ReviewItem: {
        type: "object",
        required: ["criterionId", "decision", "score"],
        properties: {
          criterionId: uuid,
          decision: { enum: ["CONFIRMED", "REJECTED", "ADJUSTED"] },
          score: { type: "integer", minimum: 0 },
          note: { type: ["string", "null"], maxLength: 2000 },
        },
      },
      PublicReviewItem: {
        type: "object",
        required: ["decision", "score"],
        properties: {
          decision: { enum: ["CONFIRMED", "REJECTED", "ADJUSTED"] },
          score: { type: "integer", minimum: 0 },
          note: { type: ["string", "null"] },
        },
      },
      ReviewInput: {
        type: "object",
        required: ["items"],
        properties: {
          feedback: { type: "string", maxLength: 4000 },
          items: { ...array(ref("ReviewItem")), maxItems: 50 },
        },
      },
      Review: {
        type: "object",
        properties: {
          id: uuid,
          assessorId: uuid,
          assessorName: str,
          feedback: { type: ["string", "null"] },
          finalizedAt: time,
          items: array(ref("ReviewItem")),
        },
      },
      SubmissionDetail: {
        allOf: [
          ref("Submission"),
          {
            type: "object",
            properties: {
              rubricVersion: ref("RubricVersion"),
              criteria: array(ref("Criterion")),
              analysis: {
                type: ["object", "null"],
                description:
                  "Student hanya menerima id, startedAt, finishedAt, evidence. Metadata provider/rawResponse hanya untuk asesor.",
                properties: {
                  id: uuid,
                  startedAt: time,
                  finishedAt: time,
                  evidence: array(ref("Evidence")),
                },
              },
              review: {
                anyOf: [ref("Review"), { type: "null" }],
                description: "Selalu null bagi student sebelum COMPLETED.",
              },
            },
          },
        ],
      },
      Share: {
        type: "object",
        properties: {
          id: uuid,
          submissionId: uuid,
          expiresAt: time,
          revokedAt: time,
          createdAt: time,
        },
      },
      ShareCreated: {
        type: "object",
        properties: { id: uuid, token: str, url: str, expiresAt: time },
      },
      PublicEvidence: {
        type: "object",
        properties: {
          student: {
            type: "object",
            properties: { name: str, schoolName: str, programKeahlian: str },
          },
          rubric: {
            type: "object",
            properties: {
              title: str,
              description: { type: ["string", "null"] },
            },
          },
          result: {
            type: "object",
            properties: {
              normalizedScore: str,
              feedback: str,
              completedAt: time,
              criteria: array({
                type: "object",
                properties: {
                  code: str,
                  title: str,
                  maxScore: { type: "integer" },
                  review: {
                    anyOf: [ref("PublicReviewItem"), { type: "null" }],
                  },
                },
              }),
            },
          },
          videoUrl: str,
          expiresAt: time,
        },
      },
    },
  },
  paths: {
    "/api/auth/sign-up/email": {
      post: operation(
        "Daftar siswa melalui Better Auth",
        {
          type: "object",
          description:
            "Response native Better Auth: token dan user; cookie session.",
        },
        {
          security: [],
          requestBody: body({
            type: "object",
            required: ["name", "email", "password"],
            properties: {
              name: str,
              email: str,
              password: { type: "string", minLength: 8 },
            },
          }),
        },
      ),
    },
    "/api/auth/sign-in/email": {
      post: operation(
        "Masuk melalui Better Auth",
        {
          type: "object",
          description: "Response native Better Auth dengan cookie session.",
        },
        {
          security: [],
          requestBody: body({
            type: "object",
            required: ["email", "password"],
            properties: { email: str, password: str },
          }),
        },
      ),
    },
    "/api/auth/sign-out": {
      post: operation("Keluar melalui Better Auth", { type: "object" }),
    },
    "/api/auth/get-session": {
      get: operation(
        "Session native Better Auth atau null",
        { type: ["object", "null"] },
        { security: [] },
      ),
    },
    "/api/auth/change-password": {
      post: operation(
        "Ubah password dan opsional cabut session lain melalui Better Auth",
        { type: "object" },
        {
          requestBody: body({
            type: "object",
            required: ["currentPassword", "newPassword"],
            properties: {
              currentPassword: str,
              newPassword: { type: "string", minLength: 8 },
              revokeOtherSessions: { type: "boolean" },
            },
          }),
        },
      ),
    },
    "/api/v1/auth/register": {
      post: operation(
        "Registrasi siswa lengkap atau permohonan asesor pending",
        envelope({
          type: "object",
          properties: {
            id: str,
            accessStatus: { enum: ["ACTIVE", "PENDING"] },
          },
        }),
        {
          security: [],
          requestBody: body({
            oneOf: [
              {
                type: "object",
                required: [
                  "intent",
                  "name",
                  "email",
                  "password",
                  "nisn",
                  "phone",
                  "schoolName",
                  "programKeahlian",
                ],
                properties: {
                  intent: { const: "STUDENT" },
                  name: str,
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, maxLength: 128 },
                  nisn: { type: "string", pattern: "^[0-9]{10}$" },
                  phone: str,
                  schoolName: str,
                  programKeahlian: str,
                },
              },
              {
                type: "object",
                required: [
                  "intent",
                  "name",
                  "email",
                  "password",
                  "employeeId",
                  "schoolName",
                  "programKeahlian",
                ],
                properties: {
                  intent: { const: "ASSESSOR" },
                  name: str,
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, maxLength: 128 },
                  employeeId: str,
                  schoolName: str,
                  programKeahlian: str,
                },
              },
            ],
          }),
        },
        201,
      ),
    },
    "/api/v1/auth/login": {
      post: operation(
        "Masuk dengan email, nomor telepon siswa, atau NIP asesor disetujui",
        envelope({
          type: "object",
          properties: { signedIn: { type: "boolean" } },
        }),
        {
          security: [],
          requestBody: body({
            type: "object",
            required: ["identifier", "password"],
            properties: { identifier: str, password: str },
          }),
        },
      ),
    },
    "/api/v1/assessments/students": {
      get: operation(
        "Daftar siswa organisasi dengan pagination dan jumlah pengajuan",
        {
          type: "object",
          properties: {
            data: array({
              type: "object",
              properties: {
                id: str,
                name: str,
                nisn: { type: ["string", "null"] },
                schoolName: { type: ["string", "null"] },
                programKeahlian: { type: ["string", "null"] },
                submissionCount: { type: "integer" },
              },
            }),
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                programs: array(str),
              },
            },
          },
        },
        {
          parameters: [
            {
              name: "group",
              in: "query",
              schema: { enum: ["pending", "completed"], default: "pending" },
            },
            {
              name: "q",
              in: "query",
              schema: { type: "string", maxLength: 120 },
            },
            {
              name: "program",
              in: "query",
              schema: { type: "string", maxLength: 180 },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
        },
      ),
    },
    "/api/v1/submissions/{id}/portfolio": {
      post: operation(
        "Tambahkan hasil selesai milik siswa ke portofolio",
        envelope({
          type: "object",
          properties: { id: uuid, portfolioIncluded: { const: true } },
        }),
        { parameters: [idParameter] },
      ),
    },
    "/api/v1/portfolio/share": {
      get: operation(
        "Metadata tautan portofolio aktif tanpa token mentah",
        envelope({
          type: ["object", "null"],
          properties: { id: uuid, expiresAt: time },
        }),
      ),
      post: operation(
        "Buat tautan portofolio; cabut tautan lama secara atomic",
        envelope({
          type: "object",
          properties: {
            id: uuid,
            token: str,
            url: { type: "string", format: "uri" },
            expiresAt: time,
          },
        }),
        {},
        201,
      ),
      delete: operation(
        "Jadikan portofolio pribadi dan cabut seluruh tautan",
        envelope({ type: "object", properties: { revoked: { const: true } } }),
      ),
    },
    "/api/public/portfolios/{token}": {
      get: operation(
        "Portofolio publik aktif berisi identitas minimum dan hasil pilihan yang selesai",
        envelope({
          type: "object",
          properties: {
            student: {
              type: "object",
              properties: {
                name: str,
                image: { type: ["string", "null"] },
                schoolName: { type: ["string", "null"] },
                programKeahlian: { type: ["string", "null"] },
              },
            },
            expiresAt: time,
            items: array({
              type: "object",
              properties: {
                id: uuid,
                title: str,
                description: { type: ["string", "null"] },
                score: { type: "string" },
                completedAt: time,
                feedback: { type: ["string", "null"] },
              },
            }),
          },
        }),
        { security: [], parameters: [tokenParameter] },
      ),
    },
    "/api/v1/me": {
      get: operation(
        "Pengguna dan profil",
        envelope({
          type: "object",
          properties: {
            user: ref("User"),
            profile: ref("Profile"),
            assessorApplication: {
              type: ["object", "null"],
              properties: {
                id: uuid,
                status: { enum: ["PENDING", "APPROVED", "REJECTED"] },
                employeeId: str,
                institution: str,
                programKeahlian: str,
              },
            },
            assessorProfile: {
              type: ["object", "null"],
              properties: {
                employeeId: str,
                institution: str,
                programKeahlian: str,
              },
            },
          },
        }),
      ),
    },
    "/api/v1/me/profile": {
      patch: operation(
        "Simpan profil siswa secara atomic",
        envelope({
          type: "object",
          properties: {
            nisn: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            schoolName: { type: ["string", "null"] },
            programKeahlian: { type: ["string", "null"] },
            notificationStatusEnabled: { type: "boolean" },
            notificationResultEnabled: { type: "boolean" },
          },
        }),
        {
          requestBody: body({
            type: "object",
            required: ["name", "schoolName", "programKeahlian"],
            properties: {
              name: { type: "string", minLength: 2, maxLength: 120 },
              schoolName: { type: "string", minLength: 2, maxLength: 180 },
              programKeahlian: { type: "string", minLength: 2, maxLength: 180 },
              nisn: { type: ["string", "null"], pattern: "^[0-9]{10}$" },
              phone: { type: ["string", "null"] },
              image: { type: ["string", "null"], format: "uri" },
              notificationStatusEnabled: { type: "boolean" },
              notificationResultEnabled: { type: "boolean" },
            },
          }),
        },
      ),
    },
    "/api/v1/dashboard": {
      get: operation(
        "Agregat scoped dan lima pengajuan terbaru",
        envelope({
          type: "object",
          properties: {
            counts: {
              type: "object",
              additionalProperties: { type: "integer" },
            },
            recent: array(ref("Submission")),
            statistics: {
              type: "object",
              properties: {
                averageScore: { type: ["string", "null"] },
                completedThisMonth: { type: "integer" },
                activeRubrics: { type: "integer" },
              },
            },
          },
        }),
      ),
    },
    "/api/v1/rubrics": {
      get: operation("Daftar rubrik scoped", envelope(array(ref("Rubric")))),
      post: operation(
        "Buat draft rubrik dan versi pertama",
        envelope(ref("Rubric")),
        { requestBody: body(ref("RubricInput")) },
        201,
      ),
    },
    "/api/v1/rubrics/extract": {
      post: operation(
        "Ekstrak satu PDF menjadi calon draft tanpa persistence (asesor)",
        envelope({
          type: "object",
          required: ["draft", "simulated", "requiresHumanReview"],
          properties: {
            draft: ref("RubricInput"),
            simulated: { type: "boolean" },
            requiresHumanReview: { const: true },
          },
        }),
        {
          description:
            "PDF maksimal 10 MiB; MIME diperiksa dari isi. Timeout 60 detik. Error: MISSING_FIELDS, INVALID_RUBRIC_FILE, FILE_TOO_LARGE, INVALID_CONTENT_TYPE, UNSUPPORTED_RUBRIC_FILE, RUBRIC_EXTRACTION_TIMEOUT, RUBRIC_EXTRACTION_INVALID, RUBRIC_EXTRACTION_FAILED. FAKE_AI menghasilkan contoh, bukan ekstraksi isi file.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Satu PDF maksimal 10485760 bytes",
                    },
                  },
                },
              },
            },
          },
        },
      ),
    },
    "/api/v1/rubrics/{id}": {
      get: operation(
        "Rubrik beserta versi dan kriteria; siswa hanya menerima versi aktif",
        envelope(ref("Rubric")),
        { parameters: [idParameter] },
      ),
    },
    "/api/v1/rubrics/{id}/draft": {
      put: operation(
        "Edit versi draft terbaru tanpa mengubah versi aktif",
        envelope(ref("RubricVersion")),
        {
          parameters: [idParameter],
          requestBody: body(ref("RubricInput")),
        },
      ),
    },
    "/api/v1/rubrics/{id}/versions": {
      post: operation(
        "Buat versi draft baru tanpa mengubah activeVersionId",
        envelope(ref("RubricVersion")),
        {
          parameters: [idParameter],
          requestBody: { ...body(ref("RubricInput")), required: false },
        },
        201,
      ),
    },
    "/api/v1/rubrics/{id}/versions/{versionId}": {
      put: operation(
        "Edit draf tertentu; versi terbit immutable",
        envelope(ref("RubricVersion")),
        {
          parameters: [
            idParameter,
            { name: "versionId", in: "path", required: true, schema: uuid },
          ],
          requestBody: body(ref("RubricInput")),
        },
      ),
      delete: operation(
        "Hapus draf yang belum pernah terbit",
        envelope({
          type: "object",
          properties: { id: uuid, deleted: { const: true } },
        }),
        {
          parameters: [
            idParameter,
            { name: "versionId", in: "path", required: true, schema: uuid },
          ],
        },
      ),
    },
    "/api/v1/rubrics/{id}/publish": {
      post: operation(
        "Publikasikan atau aktifkan versi terpilih",
        envelope(ref("Rubric")),
        {
          parameters: [idParameter],
          requestBody: {
            ...body({ type: "object", properties: { versionId: uuid } }),
            required: false,
          },
        },
      ),
    },
    "/api/v1/rubrics/{id}/archive": {
      post: operation("Arsipkan rubrik", envelope(ref("Rubric")), {
        parameters: [idParameter],
      }),
    },
    "/api/v1/submissions": {
      get: operation(
        "Riwayat pengajuan dengan pagination",
        {
          type: "object",
          properties: {
            data: array(ref("Submission")),
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
              },
            },
          },
          required: ["data", "meta"],
        },
        {
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            { name: "status", in: "query", schema: { enum: statusEnum } },
            { name: "studentId", in: "query", schema: uuid },
            {
              name: "group",
              in: "query",
              schema: { enum: ["pending", "completed"] },
            },
            { name: "period", in: "query", schema: { enum: ["currentMonth"] } },
            {
              name: "minScore",
              in: "query",
              schema: { type: "number", minimum: 0, maximum: 100 },
            },
          ],
        },
      ),
      post: operation(
        "Terima video dan antrekan analisis",
        envelope(ref("Submission")),
        {
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["rubricVersionId", "video"],
                  properties: {
                    rubricVersionId: uuid,
                    video: {
                      type: "string",
                      format: "binary",
                      description:
                        "MP4/WebM/MOV; default 100 MiB dan maksimal 120000 ms inklusif. VIDEO_TOO_LONG mengembalikan fields.durationMs dan fields.maxDurationMs",
                    },
                  },
                },
              },
            },
          },
        },
        202,
      ),
    },
    "/api/v1/submissions/{id}": {
      get: operation(
        "Detail dengan visibility berdasarkan role",
        envelope(ref("SubmissionDetail")),
        { parameters: [idParameter] },
      ),
    },
    "/api/v1/submissions/{id}/retry-analysis": {
      post: operation(
        "Retry dari ANALYSIS_FAILED",
        envelope({
          type: "object",
          properties: { id: uuid, status: { const: "QUEUED" } },
        }),
        { parameters: [idParameter] },
      ),
    },
    "/api/v1/submissions/{id}/review/start": {
      post: operation(
        "Klaim review; 200 untuk claim ulang asesor yang sama",
        envelope(ref("Review")),
        {
          parameters: [idParameter],
          responses: {
            ...errors,
            200: response(
              "Review sudah diklaim asesor yang sama",
              envelope(ref("Review")),
            ),
            201: response("Review baru", envelope(ref("Review"))),
          },
        },
        201,
      ),
    },
    "/api/v1/submissions/{id}/review": {
      put: operation(
        "Simpan draft; items dikembalikan saat GET detail",
        envelope(ref("Review")),
        { parameters: [idParameter], requestBody: body(ref("ReviewInput")) },
      ),
    },
    "/api/v1/submissions/{id}/review/finalize": {
      post: operation(
        "Finalisasi atomic; denominator seluruh kriteria termasuk opsional",
        envelope({
          allOf: [
            ref("Review"),
            {
              type: "object",
              properties: { normalizedScore: { type: "number" } },
            },
          ],
        }),
        { parameters: [idParameter], requestBody: body(ref("ReviewInput")) },
      ),
    },
    "/api/v1/portfolio": {
      get: operation(
        "Hasil COMPLETED dan metadata share siswa",
        envelope(
          array({
            type: "object",
            properties: {
              submission: ref("Submission"),
              rubric: ref("RubricVersion"),
              shares: array(ref("Share")),
              verifiedCriterionCount: { type: "integer", minimum: 0 },
            },
          }),
        ),
      ),
    },
    "/api/v1/submissions/{id}/shares": {
      post: operation(
        "Buat share; token mentah hanya dikembalikan sekali",
        envelope(ref("ShareCreated")),
        {
          parameters: [idParameter],
          requestBody: {
            ...body({
              type: "object",
              properties: {
                expiresInHours: { type: "integer", minimum: 1, maximum: 720 },
              },
            }),
            required: false,
          },
        },
        201,
      ),
    },
    "/api/v1/shares/{id}": {
      delete: operation(
        "Cabut share milik siswa secara idempotent",
        envelope({
          type: "object",
          properties: { id: uuid, revoked: { const: true } },
        }),
        { parameters: [idParameter] },
      ),
    },
    "/api/public/evidence/{token}": {
      get: operation(
        "Bukti final melalui share aktif",
        envelope(ref("PublicEvidence")),
        { security: [], parameters: [tokenParameter] },
      ),
    },
    "/api/health/live": {
      get: operation(
        "Liveness tanpa dependency",
        { type: "object", properties: { status: str } },
        { security: [] },
      ),
    },
    "/api/health/ready": {
      get: operation(
        "Readiness PostgreSQL dan object storage",
        {
          type: "object",
          properties: { status: { enum: ["ready", "not_ready"] } },
        },
        {
          security: [],
          responses: {
            200: response("Siap", { type: "object" }),
            503: response("Dependency belum siap", { type: "object" }),
          },
        },
      ),
    },
    "/api/openapi.json": {
      get: operation(
        "Spesifikasi OpenAPI",
        { type: "object" },
        { security: [] },
      ),
    },
    ...Object.fromEntries(
      [
        "/api/v1/submissions/{id}/video",
        "/api/public/evidence/{token}/video",
      ].map((path) => [
        path,
        {
          get: operation(
            "Streaming video privat dengan HTTP Range",
            {},
            {
              security: path.includes("public") ? [] : [{ cookieSession: [] }],
              parameters: [
                path.includes("public") ? tokenParameter : idParameter,
                { name: "Range", in: "header", schema: str },
              ],
              responses: {
                ...errors,
                200: {
                  description: "Video penuh",
                  content: {
                    "video/mp4": {
                      schema: { type: "string", format: "binary" },
                    },
                    "video/webm": {
                      schema: { type: "string", format: "binary" },
                    },
                    "video/quicktime": {
                      schema: { type: "string", format: "binary" },
                    },
                  },
                },
                206: {
                  description: "Potongan video",
                  headers: {
                    "Content-Range": { schema: str },
                    "Accept-Ranges": { schema: str },
                  },
                },
                416: {
                  description: "Range tidak valid",
                  headers: { "Content-Range": { schema: str } },
                },
              },
            },
          ),
        },
      ]),
    ),
  },
};
