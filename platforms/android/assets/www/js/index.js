/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var urlSync = 'http://10.0.0.101:8080/procity/soa/service/mobile.';
var listaOcorrencias = [];
var map;

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();

$(document).on('pageshow', '#loginPage', function(){ 
    var content_width = $.mobile.activePage.find("div[data-role='main']:visible:visible").outerWidth();
    $('#popupLogin').css({'width':content_width*0.8});
    $('#popupCadastrar').css({'width':content_width*0.8});

 /*   // verificando se já fez login anteriormente
    if (window.localStorage.getItem("email_usuario") != null){
        // direcionando para a pagina principal                 
        $.mobile.changePage("inicial.html");  
    }*/
});

function entrar(){
     $.mobile.changePage("inicial.html");  
}

/*
* Evento ao iniciar a pagina Incial, pegando localizaÃ§Ã£o atual
* Google Maps documentation: http://code.google.com/apis/maps/documentation/javascript/basics.html
* Geolocation documentation: http://dev.w3.org/geo/api/spec-source.html
*/
$(document).on("pageshow", "#inicial", function() {
  // verificando a conexÃ£o com a internet   
  if (!navigator.onLine){
    document.getElementById("map-canvas").innerHTML = '<p><h1><strong>Sem Conexão com a Internet</strong></h1>';
    return false;
  }
  var defaultLatLng = new google.maps.LatLng(-21.292855, -46.685126);  // Default to Formiga/MG, CA when no geolocation support -20.462245, -45.430365
  if ( navigator.geolocation ) {      
      function success(pos) {          
          // Location found, show map with these coordinates
          drawMap(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude), 14);          
      }
      function fail(error) {          
        navigator.notification.alert('Não foi possível pegar sua posição através do GPS!\n' +
          'Código: ' + error.code + '\n' +
          'Mensagem: ' + error.message, function(){}, 'Atenção!', 'Fechar');

        drawMap(defaultLatLng,14);  // Failed to find location, show default map
      }
      // Find the users current position.  Cache the location for 5 minutes, timeout after 6 seconds
      navigator.geolocation.getCurrentPosition(success, fail, {maximumAge: 500000, enableHighAccuracy:true, timeout: 10000});
  } else {   
      navigator.notification.alert('Verifique se sua internet e seu GPS estão ativados!', function(){}, 'Atenção!', 'Fechar');
      drawMap(defaultLatLng, 14);  // No geolocation support, show default map
  }
  
  function drawMap(latlng, zoomSize) {
      var myOptions = {
          zoom: zoomSize,
          center: latlng,
          mapTypeId: google.maps.MapTypeId.ROADMAP
      };      
      map = new google.maps.Map(document.getElementById("map-canvas"), myOptions);

      // linhas abaixo colocadas para redimensionar os mapas
      var center = map.getCenter();
      google.maps.event.trigger(map, "resize");
      map.setCenter(center);

      buscarMinhasOcorrencias();
  }
});

/*
* Realiza o login do usuário.
*/
function realizaLogin(){
    // verficia se informou algum valor
    if($("#email").val() != '' && $("#senha").val() != '') {           
        // verificando se o usuário existe        
        $.mobile.loading( "show", {
           // text: "Aguarde! Sincronizando dados...",
            textVisible: false,
            theme: "a",
            textonly: false,
            html: ""
        });        

        // gerando o token para o acesso ao servidor
        token = gerarTokenSync($("#email").val(), $("#senha").val());

        var urlSyncPessoa = urlSync + "pessoa?token=" + token + "(" + $("#email").val() + ")";

        // realiza a chamada no servidor
        $.ajax({
            url: urlSyncPessoa,
            type: 'GET',
            async: false,
            cache: false,
            timeout: 90000,        
            // retorno de sucesso da chamada
            success: function( data ) {
                if (data.pessoa != null){
                    retornoRequest = data.pessoa;
                    // armazenando os dados
                    window.localStorage.setItem("id_usuario", data.pessoa[0].id);
                    window.localStorage.setItem("email_usuario", data.pessoa[0].email);
                    window.localStorage.setItem("senha_usuario", $("#senha").val());

                    // direcionando para a pagina principal                 
                    $.mobile.changePage("inicial.html", {transition: "fade"});                                
                } else {
                    // retornando que não encotrou a pessoa
                    data = $.parseJSON(data);
                    exibeErroSincronizar(data);
                    return;          
                }
            },

            // retorno de erro da chamada
            error: function(jqXHR, exception) {
                trataErroSincronizacao(jqXHR, exception);
                return;
            }
        });

    } else {
        // solicita ao usuário informar um login e uma senha                
        navigator.notification.alert(
            'Você deve informar seu Email e sua Senha!',
            function(){},
            'Atenção!',
            'Fechar');                        
    }
}

/**
* Realiza a busca das ocorrencias
*/
function buscarMinhasOcorrencias(){
    // verificando se já buscou as ocorrencias
    if (listaOcorrencias.length == 0){
        // verificando se tem ocorrencias para o usuario
        $.mobile.loading( "show", {
           // text: "Aguarde! Sincronizando dados...",
            textVisible: false,
            theme: "a",
            textonly: false,
            html: ""
        });        

        // gerando o token para o acesso ao servidor
        token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

        var urlSyncOcorrencia = urlSync + "ocorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

        // realiza a chamada no servidor
        $.ajax({
            url: urlSyncOcorrencia,
            type: 'GET',
            async: false,
            cache: false,
            timeout: 90000,        
            // retorno de sucesso da chamada
            success: function( data ) {
                if (data.ocorrencia != null){                    
                    // exibindo os marcadores no mapa
                    $.each(data.ocorrencia, function(index, ocorrencia) {    
                        listaOcorrencias.push(ocorrencia);                      
                        var titulo = "<p><b>Tipo: </b>" + ocorrencia.descricaoTipo  + "<br />" + 
                                    "<b>Status: </b>" + ocorrencia.statusOcorrencia.lookup  + "<br />" + 
                                    "<b>Data: </b>" + ocorrencia.dataOcorrencia  + "<br />" + 
                                    "<b>Protocolo: </b>" + ocorrencia.protocolo + "</p>";

                        var icone;

                        if (ocorrencia.statusOcorrencia.lookup == "Em Aberto") {
                            icone = "http://maps.google.com/mapfiles/ms/micons/red-dot.png";                        
                        } else if (ocorrencia.statusOcorrencia.lookup == "Encaminhada") {
                            icone = "http://maps.google.com/mapfiles/ms/micons/blue-dot.png";                        
                        } else if (ocorrencia.statusOcorrencia.lookup == "Em Análise") {
                            icone = "http://maps.google.com/mapfiles/ms/micons/yellow-dot.png";                        
                        } else {
                            icone = "http://maps.google.com/mapfiles/ms/micons/green-dot.png";                        
                        }

                        var marker = new google.maps.Marker({
                            position: new google.maps.LatLng(ocorrencia.latitude, ocorrencia.longitude),
                            title: titulo,
                            map: map,
                            icon: icone
                        });

                        var infowindow = new google.maps.InfoWindow(), marker;
 
                        google.maps.event.addListener(marker, 'click', (function(marker, i) {
                            return function() {
                                infowindow.setContent(titulo);
                                infowindow.open(map, marker);
                            }
                        })(marker))

                              
                    });

                    $.mobile.loading( "hide" ); 
                    
                } else {
                    // retornando que ouve um erro
                    data = $.parseJSON(data);
                    exibeErroSincronizar(data);
                    return;          
                }
            },

            // retorno de erro da chamada
            error: function(jqXHR, exception) {
                trataErroSincronizacao(jqXHR, exception);
                return;
            }
        });
    }
}


/** 
* Gera o token para sincronizaão dos dados 
*/
function gerarTokenSync(emailUsuario, senhaUsuario){
  // cripitografando a senha informada pelo usuario
  var senhaCrip = $.md5(senhaUsuario);

  // concatenando a data atual no formato esperado yyyyMMddHH
  var dataAtual = getDataAtual(false, true);

  // retorna o token critptografado
  return $.md5(emailUsuario + senhaCrip.toUpperCase() + dataAtual);
}

/*
* Retorna a data atual de acordo com os parametros informados
*/
function getDataAtual(exibeSeparador, exibeHoras){
  // ajustando a data atual
  var fullDate = new Date();
  // acrescenta o 0 caso o mes for menor que 10
  var mes = ("0" + (fullDate.getMonth() + 1)).slice(-2);
  // acrescenta o 0 caso o dia for menor que 10
  var dia = ("0" + fullDate.getDate()).slice(-2);
  // acrescenta o 0 caso a hora for menor que 10
  var horas =  ("0" + fullDate.getHours()).slice(-2);

  if (exibeHoras){
    return fullDate.getFullYear() + mes + dia;//  + horas;
  }

  if (exibeSeparador){
    return fullDate.getFullYear() + '-' + mes + '-' + dia;
  } 
}

/*
* Tratamento de erro ao realizar a sincronização
*/
function trataErroSincronizacao(jqXHR, exception){
    
    // escondendo o loading
    $.mobile.loading( "hide" ); 

    var mensagem;
    if (jqXHR.status === 0) {
        mensagem = 'Sem conexão com a Internet.';
    } else if (jqXHR.status == 404) {
        mensagem = 'Página solicitada não encontrada.';
    } else if (jqXHR.status == 500) {   
        mensagem = 'Ocorreu um erro interno no servidor.';
    } else if (exception === 'parsererror') {
        mensagem = 'Ocorreu um erro ao converter os dados.';
    } else if (exception === 'timeout') {
        mensagem = 'Tempo de espera da solicitação esgotado.';
    } else if (exception === 'abort') {
        mensagem = 'Solicitação abortada.';
    } else {
        mensagem = 'Erro não categorizado.\n' + jqXHR.responseText;
    }
    // exibe o erro
    navigator.notification.alert(
        'Erro ao realizar a busca dos dados!\n' +
        'Mensagem: ' + mensagem,
        function(){},
        'Atenção!',
        'Fechar');  
}

/* 
* Exibe o erro ao realizar a sincronização
*/
function exibeErroSincronizar(data){

    // escondendo o loading
    $.mobile.loading( "hide" ); 

    navigator.notification.alert(
        'Erro ao realizar a busca os dados!\n' +
        'Mensagem: ' + data.messages.erro,
        function(){},
        'Atenção!',
        'Fechar');                  
}


// função para executar o select count para colocar alerta no navbar
$(document).on("pageshow",function(event, ui){    
    // removendo o active das paginas e colocando
    $.mobile.activePage.find('.ui-btn-active').removeClass('ui-btn-active');          
    // ajustando o active do navbar
    if($.mobile.activePage.is('#inicial')){      
      $.mobile.activePage.find('.ui-icon-navigation').addClass('ui-btn-active ui-focus');      
    } else if($.mobile.activePage.is('#sobre')){
      $.mobile.activePage.find('.ui-icon-info').addClass('ui-btn-active ui-focus');
    } else if($.mobile.activePage.is('#ocorrencia')){
      $.mobile.activePage.find('.ui-icon-bullets').addClass('ui-btn-active ui-focus');
    }
});

// listando os imoveis de trabalho
$(document).on("pageshow", "#ocorrencia", function() {    
    var listaMinhasOcorrencias = document.getElementById("listaMinhasOcorrencias");
    var lista = '';

    if (listaOcorrencias.length > 0) {
        lista = lista + "<li id='lvwOcorrencias'></li>";

        for (var i = 0; i < listaOcorrencias.length; i++) {
            var ocorrencia = listaOcorrencias[i];   
      
            lista = lista + '<li class="ui-li-has-thumb">';      
           
              var foto = ocorrencia.conteudoBinarioFoto;

              if (null != foto && foto.indexOf('image') == 0){    
                lista = lista + '<img src="' + ocorrencia.conteudoBinarioFoto + '" class="ui-li-thumb" />';        
              } else {
                lista = lista + '<img src="img/sem_imagem.jpg" class="ui-li-thumb" />';
              }
      
            lista = lista + '<h1><b>Tipo:</b> ' + ocorrencia.descricaoTipo + '</h1>';
            lista = lista + '<p><b>Endereço:</b> ' + ocorrencia.endereco + '</p>';
            lista = lista + '<p><b>Data:</b> ' + ocorrencia.dataOcorrencia + '</p>';
            lista = lista + '<p><b>Protocolo:</b> ' + ocorrencia.protocolo + '</p>';
            lista = lista + '<p><b>Status: </b>' + ocorrencia.statusOcorrencia.lookup + '</p>';
            lista = lista + '</a></li>'; 
        }
    
        listaMinhasOcorrencias.innerHTML = lista; 
   
        $("#content").find("ul").listview("refresh");
    }  

    // comando para 
    $('#ocorrencia').trigger('create');  
});