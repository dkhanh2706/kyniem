const pool = require("../db");

const {
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const crypto = require("crypto");

const r2 = require("../config/r2");

/*
====================================================
HELPER
====================================================
*/

// Xóa dấu "/" thừa ở cuối URL
const getPublicUrl = () => {
  return String(process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
};

// Tạo tên file an toàn
const createFileKey = (albumId, file) => {
  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const extension = extensionMap[file.mimetype] || "jpg";

  const uniqueName = crypto.randomUUID();

  return `albums/${albumId}/${Date.now()}-${uniqueName}.${extension}`;
};

// Kiểm tra album có thuộc user hiện tại hay không
const findOwnedAlbum = async (albumId, userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM albums
      WHERE id = $1
      AND user_id = $2
    `,
    [albumId, userId],
  );

  return result.rows[0];
};

/*
====================================================
LẤY DANH SÁCH ALBUM
GET /api/albums
====================================================
*/

exports.getAlbums = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.user_id,
        a.title,
        a.description,
        a.cover_url,
        a.created_at,
        a.updated_at,

        u.username,
        u.display_name,

        COUNT(ap.id)::integer AS photo_count

      FROM albums a

      JOIN users u
        ON u.id = a.user_id

      LEFT JOIN album_photos ap
        ON ap.album_id = a.id

      GROUP BY
        a.id,
        u.username,
        u.display_name

      ORDER BY a.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      albums: result.rows,
    });
  } catch (error) {
    console.error("getAlbums error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách album.",
    });
  }
};

/*
====================================================
LẤY CHI TIẾT MỘT ALBUM
GET /api/albums/:id
====================================================
*/

exports.getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;

    const albumResult = await pool.query(
      `
        SELECT
          a.*,
          u.username,
          u.display_name

        FROM albums a

        JOIN users u
          ON u.id = a.user_id

        WHERE a.id = $1
      `,
      [id],
    );

    if (albumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album.",
      });
    }

    const photosResult = await pool.query(
      `
        SELECT
          id,
          album_id,
          r2_key,
          image_url,
          caption,
          sort_order,
          created_at

        FROM album_photos

        WHERE album_id = $1

        ORDER BY
          sort_order ASC,
          created_at ASC
      `,
      [id],
    );

    return res.status(200).json({
      success: true,

      album: {
        ...albumResult.rows[0],
        photos: photosResult.rows,
      },
    });
  } catch (error) {
    console.error("getAlbumById error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải album.",
    });
  }
};

/*
====================================================
TẠO ALBUM
POST /api/albums
====================================================
*/

exports.createAlbum = async (req, res) => {
  try {
    const userId = req.user.id;

    const { title, description = "" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên album không được để trống.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO albums
        (
          user_id,
          title,
          description
        )

        VALUES ($1, $2, $3)

        RETURNING *
      `,
      [userId, title.trim(), description.trim()],
    );

    return res.status(201).json({
      success: true,
      message: "Tạo album thành công.",
      album: result.rows[0],
    });
  } catch (error) {
    console.error("createAlbum error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo album.",
    });
  }
};

/*
====================================================
CẬP NHẬT ALBUM
PUT /api/albums/:id
====================================================
*/

exports.updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.id;

    const { title, description, cover_url } = req.body;

    const album = await findOwnedAlbum(id, userId);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album hoặc bạn không có quyền chỉnh sửa.",
      });
    }

    const newTitle = title !== undefined ? String(title).trim() : album.title;

    const newDescription =
      description !== undefined
        ? String(description).trim()
        : album.description;

    const newCoverUrl = cover_url !== undefined ? cover_url : album.cover_url;

    if (!newTitle) {
      return res.status(400).json({
        success: false,
        message: "Tên album không được để trống.",
      });
    }

    const result = await pool.query(
      `
        UPDATE albums

        SET
          title = $1,
          description = $2,
          cover_url = $3,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $4

        RETURNING *
      `,
      [newTitle, newDescription, newCoverUrl, id],
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật album thành công.",
      album: result.rows[0],
    });
  } catch (error) {
    console.error("updateAlbum error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật album.",
    });
  }
};

/*
====================================================
UPLOAD ẢNH VÀO ALBUM
POST /api/albums/:id/photos
====================================================
*/

exports.uploadAlbumPhotos = async (req, res) => {
  const client = await pool.connect();

  const uploadedR2Keys = [];

  try {
    const { id } = req.params;

    const userId = req.user.id;

    /*
    ====================================================
    KIỂM TRA ALBUM
    ====================================================
    */

    const album = await findOwnedAlbum(id, userId);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album hoặc bạn không có quyền thêm ảnh.",
      });
    }

    /*
    ====================================================
    KIỂM TRA FILE
    ====================================================
    */

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa chọn ảnh.",
      });
    }

    if (!process.env.R2_PUBLIC_URL) {
      return res.status(500).json({
        success: false,
        message: "Server chưa cấu hình R2_PUBLIC_URL.",
      });
    }

    const publicUrl = getPublicUrl();

    await client.query("BEGIN");

    const savedPhotos = [];

    /*
    ====================================================
    UPLOAD TỪNG ẢNH LÊN R2
    ====================================================
    */

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      const key = createFileKey(id, file);

      /*
      ==============================
      UPLOAD R2
      ==============================
      */

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,

          Key: key,

          Body: file.buffer,

          ContentType: file.mimetype,

          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      uploadedR2Keys.push(key);

      const imageUrl = `${publicUrl}/${key}`;

      /*
      ==============================
      LƯU DATABASE
      ==============================
      */

      const photoResult = await client.query(
        `
          INSERT INTO album_photos
          (
            album_id,
            r2_key,
            image_url,
            sort_order
          )

          VALUES ($1, $2, $3, $4)

          RETURNING *
        `,
        [id, key, imageUrl, i],
      );

      savedPhotos.push(photoResult.rows[0]);
    }

    /*
    ====================================================
    NẾU ALBUM CHƯA CÓ COVER
    → LẤY ẢNH ĐẦU TIÊN LÀM COVER
    ====================================================
    */

    if (!album.cover_url && savedPhotos.length > 0) {
      await client.query(
        `
          UPDATE albums

          SET
            cover_url = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $2
        `,
        [savedPhotos[0].image_url, id],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,

      message: `Upload ${savedPhotos.length} ảnh thành công.`,

      photos: savedPhotos,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("uploadAlbumPhotos error:", error);

    /*
    ====================================================
    DATABASE LỖI SAU KHI ĐÃ UPLOAD R2
    → XÓA ẢNH VỪA UPLOAD KHỎI R2
    ====================================================
    */

    for (const key of uploadedR2Keys) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
          }),
        );
      } catch (deleteError) {
        console.error("Không thể rollback ảnh R2:", key, deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Không thể upload ảnh vào album.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
====================================================
SỬA CAPTION ẢNH
PUT /api/albums/photos/:photoId
====================================================
*/

exports.updatePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const userId = req.user.id;

    const { caption = "" } = req.body;

    const photoResult = await pool.query(
      `
        SELECT
          ap.*,
          a.user_id

        FROM album_photos ap

        JOIN albums a
          ON a.id = ap.album_id

        WHERE ap.id = $1
        AND a.user_id = $2
      `,
      [photoId, userId],
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh hoặc bạn không có quyền chỉnh sửa.",
      });
    }

    const result = await pool.query(
      `
        UPDATE album_photos

        SET caption = $1

        WHERE id = $2

        RETURNING *
      `,
      [String(caption).trim(), photoId],
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật ảnh thành công.",
      photo: result.rows[0],
    });
  } catch (error) {
    console.error("updatePhoto error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật ảnh.",
    });
  }
};

/*
====================================================
XÓA MỘT ẢNH
DELETE /api/albums/photos/:photoId
====================================================
*/

exports.deletePhoto = async (req, res) => {
  const client = await pool.connect();

  try {
    const { photoId } = req.params;

    const userId = req.user.id;

    const result = await client.query(
      `
        SELECT
          ap.*,
          a.user_id,
          a.cover_url

        FROM album_photos ap

        JOIN albums a
          ON a.id = ap.album_id

        WHERE ap.id = $1
        AND a.user_id = $2
      `,
      [photoId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh hoặc bạn không có quyền xóa.",
      });
    }

    const photo = result.rows[0];

    /*
    ====================================================
    XÓA FILE TRÊN R2
    ====================================================
    */

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: photo.r2_key,
      }),
    );

    await client.query("BEGIN");

    /*
    ====================================================
    XÓA DATABASE
    ====================================================
    */

    await client.query(
      `
        DELETE FROM album_photos
        WHERE id = $1
      `,
      [photoId],
    );

    /*
    ====================================================
    NẾU ẢNH ĐANG LÀ COVER
    → CHỌN ẢNH KHÁC
    ====================================================
    */

    if (photo.cover_url === photo.image_url) {
      const nextPhoto = await client.query(
        `
          SELECT image_url

          FROM album_photos

          WHERE album_id = $1

          ORDER BY
            sort_order ASC,
            created_at ASC

          LIMIT 1
        `,
        [photo.album_id],
      );

      const newCover =
        nextPhoto.rows.length > 0 ? nextPhoto.rows[0].image_url : null;

      await client.query(
        `
          UPDATE albums

          SET
            cover_url = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $2
        `,
        [newCover, photo.album_id],
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh thành công.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("deletePhoto error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa ảnh.",
    });
  } finally {
    client.release();
  }
};

/*
====================================================
ĐẶT ẢNH LÀM ẢNH BÌA
PUT /api/albums/:id/cover/:photoId
====================================================
*/

exports.setCoverPhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const userId = req.user.id;

    const album = await findOwnedAlbum(id, userId);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album hoặc bạn không có quyền chỉnh sửa.",
      });
    }

    const photoResult = await pool.query(
      `
        SELECT *
        FROM album_photos

        WHERE id = $1
        AND album_id = $2
      `,
      [photoId, id],
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ảnh không thuộc album này.",
      });
    }

    const photo = photoResult.rows[0];

    const result = await pool.query(
      `
        UPDATE albums

        SET
          cover_url = $1,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $2

        RETURNING *
      `,
      [photo.image_url, id],
    );

    return res.status(200).json({
      success: true,
      message: "Đã đặt ảnh bìa.",
      album: result.rows[0],
    });
  } catch (error) {
    console.error("setCoverPhoto error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đặt ảnh bìa.",
    });
  }
};

/*
====================================================
XÓA ALBUM
DELETE /api/albums/:id
====================================================
*/

exports.deleteAlbum = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const userId = req.user.id;

    const album = await findOwnedAlbum(id, userId);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy album hoặc bạn không có quyền xóa.",
      });
    }

    /*
    ====================================================
    LẤY TOÀN BỘ KEY R2
    ====================================================
    */

    const photosResult = await client.query(
      `
        SELECT r2_key

        FROM album_photos

        WHERE album_id = $1
      `,
      [id],
    );

    /*
    ====================================================
    XÓA FILE TRÊN R2
    ====================================================
    */

    if (photosResult.rows.length > 0) {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME,

          Delete: {
            Objects: photosResult.rows.map((photo) => ({
              Key: photo.r2_key,
            })),

            Quiet: true,
          },
        }),
      );
    }

    /*
    ====================================================
    XÓA ALBUM
    album_photos tự xóa vì ON DELETE CASCADE
    ====================================================
    */

    await client.query(
      `
        DELETE FROM albums

        WHERE id = $1
        AND user_id = $2
      `,
      [id, userId],
    );

    return res.status(200).json({
      success: true,
      message: "Xóa album thành công.",
    });
  } catch (error) {
    console.error("deleteAlbum error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa album.",
    });
  } finally {
    client.release();
  }
};
