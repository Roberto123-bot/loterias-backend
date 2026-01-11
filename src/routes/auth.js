const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const crypto = require("crypto");
const { sendEmail } = require("../config/email");

const router = express.Router();

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_aqui";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = 10;

// ==========================================
// REGISTRO DE NOVO USUÁRIO
// ==========================================
router.post("/registro", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validar dados
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios",
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email inválido",
      });
    }

    // Validar senha (mínimo 6 caracteres)
    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Senha deve ter no mínimo 6 caracteres",
      });
    }

    // Verificar se email já existe
    const checkEmail = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email.toLowerCase()]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email já cadastrado",
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    // Inserir usuário
    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email, created_at",
      [nome, email.toLowerCase(), senhaHash]
    );

    const usuario = result.rows[0];

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          created_at: usuario.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
});

// ==========================================
// LOGIN
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar dados
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      });
    }

    // 🔥 CORREÇÃO 1: Adicionei `role` e `plano` no SELECT
    const result = await pool.query(
      "SELECT id, nome, email, senha, role, plano, created_at FROM usuarios WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    const usuario = result.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    // 🔥 CORREÇÃO 2: Adicionei `role` e `plano` dentro do token
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role, // ⚠️ ADICIONAR ISSO
        plano: usuario.plano, // ⚠️ ADICIONAR ISSO
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 🔥 CORREÇÃO 3: Adicionei role e plano na resposta JSON
    res.json({
      success: true,
      message: "Login realizado com sucesso",
      data: {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role, // ⚠️ ADICIONAR ISSO
          plano: usuario.plano, // ⚠️ ADICIONAR ISSO
          created_at: usuario.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao fazer login",
    });
  }
});

// ==========================================
// VERIFICAR TOKEN (Verificar se está logado)
// ==========================================
router.get("/verificar", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token não fornecido",
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário atualizado
    const result = await pool.query(
      "SELECT id, nome, email, created_at FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      data: {
        usuario: result.rows[0],
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    res.status(401).json({
      success: false,
      message: "Token inválido",
    });
  }
});

// ==========================================
// BUSCAR PERFIL DO USUÁRIO LOGADO
// ==========================================
router.get("/perfil", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token não fornecido",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      "SELECT id, nome, email, created_at FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token inválido",
    });
  }
});

// ==========================================
// ESQUECI MINHA SENHA
// ==========================================
// ==========================================
// FORGOT PASSWORD
// ==========================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email é obrigatório",
      });
    }

    const result = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE email = $1",
      [email.toLowerCase()]
    );

    // ⚠️ Não revelar se usuário existe ou não
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: "Se o email existir, enviaremos instruções",
      });
    }

    const usuario = result.rows[0];

    // 🔐 Gerar token seguro
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      `
      UPDATE usuarios
      SET reset_token = $1,
          reset_token_expires = $2
      WHERE id = $3
      `,
      [resetToken, resetExpires, usuario.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    // 📧 Enviar email
    await sendEmail({
      to: usuario.email,
      subject: "Redefinição de senha - Roberto Loterias",
      html: `
        <h2>Olá, ${usuario.nome}</h2>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no botão abaixo para continuar:</p>
        <p>
          <a href="${resetLink}" 
             style="display:inline-block;padding:12px 20px;background:#6C5CE7;color:#fff;text-decoration:none;border-radius:6px">
            Redefinir senha
          </a>
        </p>
        <p>Este link expira em 1 hora.</p>
        <p>Se não foi você, ignore este email.</p>
      `,
      text: `Redefina sua senha: ${resetLink}`,
    });

    res.json({
      success: true,
      message: "Se o email existir, enviaremos instruções",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicitação",
    });
  }
});

// ==========================================
// RESET PASSWORD
// ==========================================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        success: false,
        message: "Token e nova senha são obrigatórios",
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Senha deve ter no mínimo 6 caracteres",
      });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE reset_token = $1
        AND reset_token_expires > NOW()
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado",
      });
    }

    const usuarioId = result.rows[0].id;

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    await pool.query(
      `
      UPDATE usuarios
      SET senha = $1,
          reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = $2
      `,
      [senhaHash, usuarioId]
    );

    res.json({
      success: true,
      message: "Senha redefinida com sucesso",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao redefinir senha",
    });
  }
});

module.exports = router;
