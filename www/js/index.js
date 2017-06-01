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
var listaTipoOcorrencias = [];
var map;
var enderecoOcorrencia = "";
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
            // pegando o endereço            
            var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'latLng': latlng
            }, function(results, status) {
                enderecoOcorrencia = '' + results[0].formatted_address.replace("Brazil","") + '';
            });                
            // Location found, show map with these coordinates
            drawMap(latlng, 14);          
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

        if (listaOcorrencias.length > 0) {
            colocaMarcadoresMapa();
        } else {
            buscarMinhasOcorrencias();
        }
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
                    // armazenando os dados                    
                    window.localStorage.setItem("email_usuario", data.pessoa[0].email);
                    window.localStorage.setItem("senha_usuario", $("#senha").val());

                    // buscando os tipos de ocorrencia
                    buscaTipoOcorrencias();                                                
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
* Realizando a busca dos tipos de ocorrencia
*/
function buscaTipoOcorrencias(){
    var email;
    var senha;
    if ($("#email").val() == ""){
        email = $("#emailCad").val()
    } else {
        email = $("#email").val();
    }

    if ($("#senha").val() == ""){
         senha = $("#senhaCad").val();
    } else {
        senha = $("#senha").val();
    }

    if (email == ""){
      email = window.localStorage.getItem("email_usuario");
    }

    if (senha == ""){
      senha =  window.localStorage.getItem("senha_usuario");
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(email, senha);

    var urlSyncOcorrencia = urlSync + "tipoOcorrencia?token=" + token + "(" + email + ")";

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncOcorrencia,
        type: 'GET',
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            if (data.tipoOcorrencia != null){      
                listaTipoOcorrencias = [];
                // exibindo os marcadores no mapa
                $.each(data.tipoOcorrencia, function(index, tipoOcorrencia) {    
                    listaTipoOcorrencias.push(tipoOcorrencia);                             
                });

                // setando a lista de tipos de ocorrencia no localstorage
                window.localStorage.setItem("tipoOcorrencias", listaTipoOcorrencias);

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
                        colocaMarcadoresMapa();                              
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
* exibido os marcadores no mapa com as ocorrencias que eu criei
*/
function colocaMarcadoresMapa(){

    if (listaOcorrencias.length > 0) {        
        for (var i = 0; i < listaOcorrencias.length; i++) {
            var ocorrencia = listaOcorrencias[i];

            var foto = ocorrencia.conteudoBinarioFoto;
            var conteudoFoto;
            if (null != foto && foto.indexOf('image') > 0){    
                conteudoFoto = '<img src="' + foto + '" height="115" width="83"/>';        
            } else {
                conteudoFoto = '<img src="img/sem_imagem.jpg" height="115" width="83"/>';
            }

            var conteudo = "";
            // Variável que define o conteúdo da Info Window
            conteudo = '<div id="iw-container">' +
                    '<div class="iw-title"> Tipo: ' + ocorrencia.descricaoTipo + ' </div>' +
                    '<div class="iw-content">' +
                      '<div class="iw-subTitle">Descrição da Ocorrência</div>' +
                      conteudoFoto +
                      '<p><b>Data: </b>' + ocorrencia.dataOcorrencia + '<br/>' +
                      '<b>Endereço: </b>' + ocorrencia.endereco + '<br>' +
                      '<b>Status: </b>' + ocorrencia.statusOcorrencia.lookup + '<br/>' +
                      '<b>Observação: </b>' + ocorrencia.observacao + '<br/> </p>' +
                      '<div class="iw-subTitle">Protocolo</div>' +
                      '<p>'+ ocorrencia.protocolo + '</p>'+                      
                    '</div>' +
                    '<div class="iw-bottom-gradient"></div>' +
                  '</div>';

            var titulo = "";
            titulo = "<p><b>Tipo: </b>" + ocorrencia.descricaoTipo + "</p>";

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


             var infowindow = new google.maps.InfoWindow(
                      { content: conteudo,                        
                      },marker);

            //var infowindow = new google.maps.InfoWindow(), marker;
            //infowindow.setContent(conteudo);
             
              // Procedimento que mostra a Info Window através de um click no marcador
              google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map,marker); // map e marker são as variáveis definidas anteriormente
              });

              // evento que fecha a infoWindow com click no mapa
              google.maps.event.addListener(map, 'click', function() {
                infowindow.close();
              });

            google.maps.event.addListener(infowindow, 'domready', function() {
  
            // Referência ao DIV que agrupa o fundo da infowindow
            var iwOuter = $('.gm-style-iw');

            /* Uma vez que o div pretendido está numa posição anterior ao div .gm-style-iw.
            * Recorremos ao jQuery e criamos uma variável iwBackground,
            * e aproveitamos a referência já existente do .gm-style-iw para obter o div anterior com .prev().
            */
            var iwBackground = iwOuter.prev();

            // Remover o div da sombra do fundo
            iwBackground.children(':nth-child(2)').css({'display' : 'none'});

            // Remover o div de fundo branco
            iwBackground.children(':nth-child(4)').css({'display' : 'none'});

            // Desloca a infowindow 115px para a direita
            iwOuter.parent().parent().css({left: '115px'});

            // Desloca a sombra da seta a 76px da margem esquerda 
            iwBackground.children(':nth-child(1)').attr('style', function(i,s){ return s + 'left: 76px !important;'});

            // Desloca a seta a 76px da margem esquerda 
            iwBackground.children(':nth-child(3)').attr('style', function(i,s){ return s + 'left: 76px !important;'});

            // Altera a cor desejada para a sombra da cauda
            iwBackground.children(':nth-child(3)').find('div').children().css({'box-shadow': 'rgba(72, 181, 233, 0.6) 0px 1px 6px', 'z-index' : '1'});

            // Referência ao DIV que agrupa os elementos do botão fechar
            var iwCloseBtn = iwOuter.next();

            // Aplica o efeito desejado ao botão fechar
            iwCloseBtn.css({opacity: '1', right: '38px', top: '3px', border: '7px solid #48b5e9', 'border-radius': '13px', 'box-shadow': '0 0 5px #3990B9'});

            // Se o conteúdo da infowindow não ultrapassar a altura máxima definida, então o gradiente é removido.
            if($('.iw-content').height() < 140){
              $('.iw-bottom-gradient').css({display: 'none'});
            }

            // A API aplica automaticamente 0.7 de opacidade ao botão após o evento mouseout. Esta função reverte esse evento para o valor desejado.
            iwCloseBtn.mouseout(function(){
              $(this).css({opacity: '1'});
            });
          });  
        }
    }
    if (listaTipoOcorrencias.length == 0){
        buscaTipoOcorrencias();
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

// listando os imoveis de trabalho
$(document).on("pageshow", "#ocorrencia", function() {    
    var listaMinhasOcorrencias = document.getElementById("listaMinhasOcorrencias");
    var lista = '';

    if (listaOcorrencias.length > 0) {
        lista = lista + "<li id='lvwOcorrencias' data-role='list-divider' data-theme='a' data-swatch='a'><h1>Minhas Ocorrências</h1></li>";

        for (var i = 0; i < listaOcorrencias.length; i++) {
            var ocorrencia = listaOcorrencias[i];   
      
            lista = lista + '<li class="ui-li-has-thumb">';      
           
            var foto = ocorrencia.conteudoBinarioFoto;

            if (null != foto && foto.indexOf('image') > 0){    
                lista = lista + '<img src="' + foto + '" class="ui-li-thumb" />';        
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

/**
*
*/
$(document).on("pageshow", "#novaOcorrencia", function() {    
    $("#endereco").text(enderecoOcorrencia);
    // removendo possiveis valores    
    $("#tipoOcorrencia").find("option").remove().end();
    // inserindo a opção [Selecione]
    $("#tipoOcorrencia").append($("<option></option>").attr("value", 0).text("[Selecione]"));    
    // inserindo os valores rafaelreis
    for (var i = 0; i < listaTipoOcorrencias.length; i++){           
      $("#tipoOcorrencia").append($("<option></option>")
        .attr("value", listaTipoOcorrencias[i].id).text(listaTipoOcorrencias[i].descricao));      
    }                

    // inicializando as fotos
    document.getElementById('fotoOcorrencia').innerHTML = 
        '<img src="img/sem_imagem.jpg" />';       

    $("#tipoOcorrencia").selectmenu("refresh");  

    // comando realizado para aplicar o estilo nos campos adicionados acima
    $("#novaOcorrencia").enhanceWithin();     
});


/**
* realizando o cadastro do usuário
*/
function realizaCadastro(){
    // verificando se informou os dados obrigatorios
    if ($("#nomeCad").val() == ""){                 
        navigator.notification.alert(
            'Você deve informar seu Nome Completo!',
            function(){},
            'Atenção!',
            'Fechar');       
        return false;        
    }

    if ($("#emailCad").val() == ""){                    
        navigator.notification.alert(
            'Você deve informar seu E-mail!',
            function(){},
            'Atenção!',
            'Fechar');       
        return false;   
    }

    var emailFilter=/^.+@.+\..{2,}$/;
    var illegalChars= /[\(\)\<\>\,\;\:\\\/\"\[\]]/   
    if(!(emailFilter.test($("#emailCad").val() )) || $("#emailCad").val().match(illegalChars)){
        navigator.notification.alert(
            'Você deve informar um E-mail válido!',
            function(){},
            'Atenção!',
            'Fechar');       
        return false; 
    }

    if ($("#senhaCad").val() == ""){
        navigator.notification.alert(
            'Você deve informar sua senha!',
            function(){},
            'Atenção!',
            'Fechar');       
        return false;  
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync($("#emailCad").val(), $("#senhaCad").val());    

    // gerando a url de envio dos dados
    var urlSyncPessoaCad = urlSync + "pessoa?token=" + token + "(" + $("#emailCad").val() + ")cadastro";

    var pessoa = new Object();
    pessoa.email = $("#emailCad").val();
    pessoa.senha = $("#senhaCad").val();
    pessoa.nome = $("#nomeCad").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pessoa: pessoa });            
    // enviando os dados
    $.ajax({
        url: urlSyncPessoaCad,
        type: 'POST',
        contentType: "application.mob/json; charset=utf-8",
        data: obj,
        async: false,
        dataType: 'json',        
        success: function (data) {
            // armazenando os dados            
            window.localStorage.setItem("email_usuario", data.pessoa.email);
            window.localStorage.setItem("senha_usuario", $("#senhaCad").val());

            // buscando os tipos de ocorrencia
            buscaTipoOcorrencias();                                    
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });       
}



$(function() {
    $( "[data-role='navbar']" ).navbar();
    $( "[data-role='header'], [data-role='footer']" ).toolbar();
});

// Update the contents of the toolbars
$( document ).on( "pagecontainershow", function() {    
    // Each of the four pages in this demo has a data-title attribute
    // which value is equal to the text of the nav button
    // For example, on first page: <div data-role="page" data-title="Info">
    var current = $( ".ui-page-active" ).jqmData( "title" );
    // verificando qual se é a pagina inicial
    if (current == "Autenticação"){
        $( "[data-role='header']" ).hide();
        $( "[data-role='navbar']" ).hide();
    } else {
        $( "[data-role='header']" ).show();
        $( "[data-role='navbar']" ).show();
    }
    // Change the heading
    $( "[data-role='header'] h1" ).text( current );

    // Remove active class from nav buttons
    $( "[data-role='navbar'] a.ui-btn-active" ).removeClass( "ui-btn-active" );
    // Add active class to current nav button
    $( "[data-role='navbar'] a" ).each(function() {
        if ( $( this ).text() === current ) {
            $( this ).addClass( "ui-btn-active" );
        }
    });
});



// tira ou remove a fotografia tirada
function manipulaFoto(element){
  // verificando se possui foto
  if ($(element).html().indexOf('file') > 0){    
    // armazenando qual imagem sera removida
    imagemDelete = element;
    // pergunta se deseja remover a foto
    navigator.notification.confirm(
        'Deseja remover a imagem?',  // message
        onConfirmDeleteImage,        // callback to invoke with index of button pressed
        'Atenção',                   // title
        'Sim,Não'                    // buttonLabels
    );    

  } else {    
    capturarImagem();    
  }
}

// funÃ§Ã£o de retorno da confirmaÃ§Ã£o de remoÃ§Ã£o de imagem
function onConfirmDeleteImage(buttonIndex){  
  // verificando se deseja remover
  if (buttonIndex == 1){            
    document.getElementById('fotoOcorrencia').innerHTML = 
              '<img src="img/sem_imagem.jpg" />';                 
  }
}

// evento que captura a imagem da camera
function capturarImagem(){
  navigator.camera.getPicture(capturarSuccess, capturarFail,
    {
      destinationType : Camera.DestinationType.DATA_URL,
      sourceType : Camera.PictureSourceType.CAMERA
    });
}

//e xibindo a imagem que foi capturada
function capturarSuccess(imageData) {   

  var img = document.getElementById('fotoOcorrencia');

  // Unhide image elements
  //
  img.style.display = 'block';

  // Show the captured photo
  // The inline CSS rules are used to resize the image
  //
  img.src = "data:image/jpeg;base64," + imageData;  
}

// erro de captura da foto
function capturarFail(message) {
  navigator.notification.alert(
      message,
      function(){},
      'Erro!',
      'Fechar'
  );
}