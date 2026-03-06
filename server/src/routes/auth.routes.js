import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, signJwt, verifyPassword } from '../lib/security.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  try {
    const input = registerSchema.parse(req.body || {});

    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email já cadastrado.' });
    }

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await hashPassword(input.password),
        credits: { create: { balance: 0 } },
      },
      include: { credits: true },
    });

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, credits: user.credits[0]?.balance || 0 },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no cadastro.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body || {});
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: { credits: true } });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(200).json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, credits: user.credits[0]?.balance || 0 },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no login.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), newPassword: z.string().min(8) });
    const input = schema.parse(req.body || {});

    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no reset de senha.' });
  }
});

export default router;
