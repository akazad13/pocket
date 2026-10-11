import {database} from '@/lib/database';
import {
  getAuthenticatedUser,
  validateDisplayName,
  validatePassword,
  verifyUserPassword,
  verifyCredentials,
  generateSalt,
  hashPassword,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD
} from '@/lib/auth';

export async function GET(request: Request) {
  const userId = getAuthenticatedUser(request);
  const db = database();

  try {
    let userRow = await db
      .prepare('SELECT id, username, name, created_at AS createdAt FROM users WHERE username = ? COLLATE NOCASE')
      .bind(userId)
      .first<{id: string; username: string; name: string; createdAt: string}>();

    if (!userRow) {
      userRow = {
        id: userId,
        username: userId,
        name: userId.toLowerCase() === DEFAULT_USERNAME.toLowerCase() ? 'Admin' : userId,
        createdAt: new Date().toISOString()
      };
    }

    const [expRow, incRow, accRow, goalRow, billRow] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE user_id = ?').bind(userId).first<{c: number}>(),
      db.prepare('SELECT COUNT(*) AS c FROM income WHERE user_id = ?').bind(userId).first<{c: number}>(),
      db.prepare('SELECT COUNT(*) AS c FROM accounts WHERE user_id = ?').bind(userId).first<{c: number}>(),
      db.prepare('SELECT COUNT(*) AS c FROM goals WHERE user_id = ?').bind(userId).first<{c: number}>(),
      db.prepare('SELECT COUNT(*) AS c FROM bills WHERE user_id = ?').bind(userId).first<{c: number}>()
    ]);

    return Response.json(
      {
        user: {
          username: userRow.username,
          name: userRow.name || userRow.username,
          createdAt: userRow.createdAt
        },
        stats: {
          expenses: expRow?.c ?? 0,
          income: incRow?.c ?? 0,
          accounts: accRow?.c ?? 0,
          goals: goalRow?.c ?? 0,
          bills: billRow?.c ?? 0
        }
      },
      {headers: {'Cache-Control': 'no-store'}}
    );
  } catch (err) {
    console.error(err);
    return Response.json({error: 'Failed to retrieve profile.'}, {status: 500});
  }
}

export async function PUT(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }

  let body: {name?: string; currentPassword?: string; newPassword?: string};
  try {
    body = (await request.json()) as {name?: string; currentPassword?: string; newPassword?: string};
  } catch {
    return Response.json({error: 'Invalid request payload.'}, {status: 400});
  }

  const userId = getAuthenticatedUser(request);
  const db = database();

  try {
    const existingUser = await db
      .prepare('SELECT id, username, password_hash AS passwordHash, salt, name FROM users WHERE username = ? COLLATE NOCASE')
      .bind(userId)
      .first<{id: string; username: string; passwordHash: string; salt: string; name: string}>();

    let validatedName: string | undefined;
    if (body.name !== undefined) {
      try {
        validatedName = validateDisplayName(body.name);
      } catch (e) {
        return Response.json({error: e instanceof Error ? e.message : 'Invalid name.'}, {status: 400});
      }
    }

    let newHash: string | undefined;
    let newSalt: string | undefined;

    if (body.newPassword) {
      try {
        validatePassword(body.newPassword);
      } catch (e) {
        return Response.json({error: e instanceof Error ? e.message : 'Invalid password.'}, {status: 400});
      }

      if (!body.currentPassword) {
        return Response.json({error: 'Current password is required to set a new password.'}, {status: 400});
      }

      let passwordValid = false;
      if (existingUser) {
        passwordValid = await verifyUserPassword(body.currentPassword, existingUser.salt, existingUser.passwordHash);
      } else if (userId.toLowerCase() === DEFAULT_USERNAME.toLowerCase()) {
        passwordValid = verifyCredentials(DEFAULT_USERNAME, body.currentPassword);
      }

      if (!passwordValid) {
        return Response.json({error: 'Current password is incorrect.'}, {status: 400});
      }

      newSalt = generateSalt();
      newHash = await hashPassword(body.newPassword, newSalt);
    }

    if (!validatedName && !newHash) {
      return Response.json({error: 'Nothing to update.'}, {status: 400});
    }

    if (existingUser) {
      if (validatedName && newHash && newSalt) {
        await db
          .prepare('UPDATE users SET name = ?, password_hash = ?, salt = ? WHERE username = ? COLLATE NOCASE')
          .bind(validatedName, newHash, newSalt, userId)
          .run();
      } else if (validatedName) {
        await db
          .prepare('UPDATE users SET name = ? WHERE username = ? COLLATE NOCASE')
          .bind(validatedName, userId)
          .run();
      } else if (newHash && newSalt) {
        await db
          .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE username = ? COLLATE NOCASE')
          .bind(newHash, newSalt, userId)
          .run();
      }
    } else {
      // Create user record for initial admin override
      const finalName = validatedName || 'Admin';
      const finalSalt = newSalt || generateSalt();
      const finalHash = newHash || (await hashPassword(DEFAULT_PASSWORD, finalSalt));
      await db
        .prepare('INSERT INTO users (id, username, password_hash, salt, name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(userId, userId, finalHash, finalSalt, finalName, new Date().toISOString())
        .run();
    }

    const finalName = validatedName || existingUser?.name || userId;
    return Response.json({
      ok: true,
      user: {
        username: userId,
        name: finalName
      }
    });
  } catch (err) {
    console.error(err);
    return Response.json({error: 'Failed to update profile.'}, {status: 500});
  }
}
