class CaixaAPI {
  constructor(loteria, config = {}) {
    this.loteria = loteria;
    this.config = config;
    this.baseURL = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria}`;
  }

  async buscarUltimo() {
    try {
      const response = await fetch(this.baseURL);
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Erro ao buscar último concurso de ${this.loteria}:`,
        error.message
      );
      return null;
    }
  }

  async buscarConcurso(numero) {
    try {
      const response = await fetch(`${this.baseURL}/${numero}`);
      if (!response.ok) return null;
      const data = await response.json();
      return this.formatarDados(data);
    } catch (error) {
      return null;
    }
  }

  formatarDados(dados) {
    if (!dados || !dados.listaDezenas) return null;

    const dezenas = dados.listaDezenas.map((d) => parseInt(d));

    const resultado = {
      concurso: dados.numero,
      dezenas: dezenas,
    };

    // Dupla-Sena tem 2 sorteios
    if (this.loteria === "duplasena" && dados.listaDezenasSegundoSorteio) {
      resultado.dezenas_2 = dados.listaDezenasSegundoSorteio.map((d) =>
        parseInt(d)
      );
      delete resultado.dezenas;
      resultado.dezenas_1 = dezenas;
    }

    // Dia de Sorte tem mês
    if (this.loteria === "diadesorte" && dados.nomeTimeCoracaoMesSorte) {
      resultado.mes_sorte = dados.nomeTimeCoracaoMesSorte;
    }

    // Timemania tem time
    if (this.loteria === "timemania" && dados.nomeTimeCoracaoMesSorte) {
      resultado.time_coracao = dados.nomeTimeCoracaoMesSorte;
    }

    return resultado;
  }
}

module.exports = CaixaAPI;
