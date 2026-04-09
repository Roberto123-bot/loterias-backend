const axios = require("axios");

class CaixaAPI {
    constructor(loteria) {
        this.loteria = loteria;
        this.baseURL = `https://servicebus3.caixa.gov.br/portaldeloterias/api/${loteria}`;

        this.client = axios.create({
            timeout: 15000,
            headers: {
                Accept: "application/json",
                "User-Agent": "SistemaLoterias/1.0",
            },
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 300,
        });
    }

    async request(url) {
        try {
            console.log(`🌐 CaixaAPI -> ${url}`);

            const response = await this.client.get(url, {
                signal: AbortSignal.timeout(15000),
            });

            return response.data;
        } catch (error) {
            console.error(`❌ Erro HTTP Caixa (${this.loteria})`);
            console.error("Mensagem:", error.message);

            if (error.code) console.error("Code:", error.code);
            if (error.response) {
                console.error("Status:", error.response.status);
            }

            return null;
        }
    }

    async buscarUltimo() {
        const data = await this.request(this.baseURL);
        return data ? this.formatarDados(data) : null;
    }

    async buscarConcurso(numero) {
        const data = await this.request(`${this.baseURL}/${numero}`);
        return data ? this.formatarDados(data) : null;
    }

    formatarDados(dados) {
        if (!dados) return null;

        const resultado = {
            numero: dados.numero,
            dataApuracao: dados.dataApuracao,
            dataProximoConcurso: dados.dataProximoConcurso,
            valorEstimadoProximoConcurso:
                parseFloat(dados.valorEstimadoProximoConcurso) || 0,
            valorAcumuladoProximoConcurso:
                parseFloat(dados.valorAcumuladoProximoConcurso) || 0,
            listaRateioPremio: dados.listaRateioPremio || [],
            listaDezenas: (dados.listaDezenas || []).map(Number),
        };

        if (this.loteria === "duplasena") {
            resultado.listaDezenasSegundoSorteio = (
                dados.listaDezenasSegundoSorteio || []
            ).map(Number);
        }

        if (this.loteria === "timemania" || this.loteria === "diadesorte") {
            resultado.nomeTimeCoracaoMesSorte =
                dados.nomeTimeCoracaoMesSorte || "";
        }

        if (this.loteria === "maismilionaria") {
            resultado.trevosSorteados = (dados.trevosSorteados || []).map(
                Number,
            );
        }

        return resultado;
    }
}

module.exports = CaixaAPI;
