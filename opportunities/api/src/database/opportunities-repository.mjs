const PUBLIC_FIELDS = `
  id,
  title,
  organization,
  category,
  description,
  eligibility,
  location,
  application_link AS applicationLink,
  source_name AS sourceName,
  source_link AS sourceLink,
  COALESCE(DATE_FORMAT(deadline, '%Y-%m-%d'), deadline_text) AS deadline,
  publication_date AS publicationDate,
  discovered_at AS discoveredAt,
  last_updated_at AS lastUpdatedAt,
  work_mode AS workMode,
  funding_details AS fundingDetails
`;

export function escapeLikeTerm(value) {
  return String(value).replace(/[!%_]/gu, (character) => `!${character}`);
}

export function buildPublicWhere(filters = {}) {
  const clauses = [
    "status = 'active'",
    'verified_at IS NOT NULL',
    '(deadline IS NULL OR deadline >= CURRENT_DATE)',
  ];
  const values = [];

  if (filters.q) {
    const pattern = `%${escapeLikeTerm(filters.q)}%`;
    clauses.push(`(
      title LIKE ? ESCAPE '!'
      OR COALESCE(organization, '') LIKE ? ESCAPE '!'
      OR COALESCE(description, '') LIKE ? ESCAPE '!'
    )`);
    values.push(pattern, pattern, pattern);
  }

  if (filters.category) {
    clauses.push('category = ?');
    values.push(filters.category);
  }

  if (filters.country) {
    clauses.push("COALESCE(location, '') LIKE ? ESCAPE '!'");
    values.push(`%${escapeLikeTerm(filters.country)}%`);
  }

  if (filters.deadlineBefore) {
    clauses.push('deadline IS NOT NULL AND deadline <= ?');
    values.push(filters.deadlineBefore);
  }

  if (filters.remote === true) {
    clauses.push("work_mode = 'remote'");
  } else if (filters.remote === false) {
    clauses.push("work_mode <> 'remote'");
  }

  return { sql: clauses.join(' AND '), values };
}

export function createOpportunityRepository(pool) {
  return Object.freeze({
    async listPublic(filters) {
      // TiDB rejects prepared-statement placeholders in LIMIT. Recheck and bound these
      // pagination integers here before interpolating; all user-supplied filters remain bound.
      const page = Number.isSafeInteger(filters.page) && filters.page >= 1 && filters.page <= 10_000
        ? filters.page
        : 1;
      const pageSize = Number.isSafeInteger(filters.pageSize) && filters.pageSize >= 1 && filters.pageSize <= 50
        ? filters.pageSize
        : 20;
      const offset = (page - 1) * pageSize;
      const where = buildPublicWhere(filters);

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM opportunities WHERE ${where.sql}`,
        where.values,
      );
      const [rows] = await pool.execute(
        `SELECT ${PUBLIC_FIELDS}
         FROM opportunities
         WHERE ${where.sql}
         ORDER BY COALESCE(publication_date, discovered_at) DESC, id ASC
         LIMIT ${pageSize} OFFSET ${offset}`,
        where.values,
      );

      return {
        data: rows,
        total: Number(countRows[0]?.total ?? 0),
      };
    },

    async getPublicById(id) {
      const where = buildPublicWhere();
      const [rows] = await pool.execute(
        `SELECT ${PUBLIC_FIELDS}
         FROM opportunities
         WHERE id = ? AND ${where.sql}
         LIMIT 1`,
        [id, ...where.values],
      );
      return rows[0] ?? null;
    },
  });
}
