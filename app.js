const express = require('express');
const nunjucks = require('nunjucks');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Configurar o mecanismo de template EJS
app.set('view engine', 'ejs');
app.set('views', __dirname); // Onde seus arquivos de modelo estão localizados

// Configure o middleware express.static para servir arquivos estáticos
app.use(express.static('public'));


app.use(bodyParser.urlencoded({ extended: true }));

nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

const db = new sqlite3.Database('inscritos.db');

// Crie a tabela para armazenar os dados dos inscritos, incluindo o total de divulgados
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS inscritos (id INTEGER PRIMARY KEY ASC, nome TEXT, email TEXT, telefone TEXT, curso TEXT, cpf TEXT, comunicacoes BOOLEAN, linkUnico TEXT, qrCode TEXT, totalDivulgados INT DEFAULT 0)");
});

app.get('/', (req, res) => {
  res.render('formulario.html');
});

// Rota de cadastro
app.post('/cadastro', (req, res) => {
  const { nome, email, telefone, curso, cpf, comunicacoes } = req.body;

  // Gere um link único para a pessoa cadastrada
  const linkUnico = uuidv4();

  // Gere um QR Code para o link único
  qrcode.toDataURL(linkUnico, (err, qrCodeDataURL) => {
    if (err) {
      throw err;
    }

    // Insira os dados no banco de dados, incluindo o link único e QR Code
    const inserirDados = db.prepare("INSERT INTO inscritos (nome, email, telefone, curso, cpf, comunicacoes, linkUnico, qrCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    inserirDados.run(nome, email, telefone, curso, cpf, comunicacoes, linkUnico, qrCodeDataURL);
    inserirDados.finalize();

    // Faça um SELECT dos dados dessa pessoa
    db.get("SELECT * FROM inscritos WHERE linkUnico = ?", [linkUnico], (err, row) => {
      if (err) {
        throw err;
      }

      // Redirecione para a página de sucesso, passando os dados como parâmetros na URL
      res.redirect(`/sucesso?linkUnico=${linkUnico}`);
    });
  });
});

// Rota para a página de sucesso
app.get('/sucesso', (req, res) => {
  const linkUnico = req.query.linkUnico;

  // Execute um SELECT para obter os dados da pessoa com base no linkUnico
  db.get("SELECT nome, linkUnico, qrCode FROM inscritos WHERE linkUnico = ?", [linkUnico], (err, row) => {
    if (err) {
      throw err;
    }

    if (row) {
      // Renderize a página de sucesso e passe os dados para o template
      res.render('sucesso.njk', { nome: row.nome, linkUnico: row.linkUnico, qrCode: row.qrCode });
    } else {
      // Lide com o caso em que o link único não foi encontrado
      res.status(404).send('Link único não encontrado');
    }
  });
});

app.get('/divulgar/:linkDivulgado', (req, res) => {
  const linkDivulgado = req.params.linkDivulgado;
  
  res.render('divulgar.njk', { link: linkDivulgado });
});

// Rota de cadastro
app.post('/divulgar', (req, res) => {
  const { nome, email, telefone, curso, cpf, comunicacoes, link } = req.body;

  // Execute um SELECT para obter os dados da pessoa com base no linkUnico
  db.get("SELECT linkUnico FROM inscritos WHERE linkUnico = ?", [link], (err, row) => {
    if (err) {
      throw err;
    }

    if (row) {
      // Renderize a página de sucesso e passe os dados para o template
      db.run(
        'UPDATE inscritos SET totalDivulgados = totalDivulgados + 1 WHERE linkUnico = ?',
        [link],
        function(err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`Registro atualizado com sucesso! Linhas afetadas: ${this.changes}`);
        }
      );
    } else {
      // Lide com o caso em que o link único não foi encontrado
      res.status(404).send('Link único não encontrado');
    }
  });

  // Gere um link único para a pessoa cadastrada
  const linkUnico = uuidv4();

  // Gere um QR Code para o link único
  qrcode.toDataURL(linkUnico, (err, qrCodeDataURL) => {
    if (err) {
      throw err;
    }

    // Insira os dados no banco de dados, incluindo o link único e QR Code
    const inserirDados = db.prepare("INSERT INTO inscritos (nome, email, telefone, curso, cpf, comunicacoes, linkUnico, qrCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    inserirDados.run(nome, email, telefone, curso, cpf, comunicacoes, linkUnico, qrCodeDataURL);
    inserirDados.finalize();

    // Faça um SELECT dos dados dessa pessoa
    db.get("SELECT * FROM inscritos WHERE linkUnico = ?", [linkUnico], (err, row) => {
      if (err) {
        throw err;
      }

      // Redirecione para a página de sucesso, passando os dados como parâmetros na URL
      res.redirect(`/sucesso?linkUnico=${linkUnico}`);
    });
  });
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
