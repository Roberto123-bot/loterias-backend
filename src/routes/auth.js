const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

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

module.exports = router;
