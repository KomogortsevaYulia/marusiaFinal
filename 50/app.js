const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config')
const morgan = require('morgan')
const port = 8000;
const initString = 'старт' 
const app = express();


const sendResponse = (text, session, session_state = {}, TTStext = text, end_session = false, buttons = []) => {
    return {
        "response": {
            "text": text,
            "tts": TTStext,
            "buttons":buttons,
            "end_session": end_session,
        },
        "session": {
            ...session,
        },
        "session_state": session_state,
        "version": "1.0"
      }
} 

var game ={
	mydata: [],     // Добавляем атрибут mydata для хранения игровых данных
	score: 0,	  	   // Добавляем атрибут оценки
	gameover: 0,	    // Добавляем состояние в конце игры 
	gamerrunning:1,	     // Добавляем состояние, когда игра запущена
	status:1,		      // Добавляем состояние игры
	start:function (){      // Устанавливаем метод при запуске игры
		this.status = this.gamerrunning;
		this.score = 0;
		this.mydata = [];  
		for(var r = 0;r < 4; r++){  // Добавьте число 0 к переменной цикла массива mydata, чтобы сделать его двумерным массивом
			this.mydata[r] = [];
			for(var c = 0;c < 4;c++){
				this.mydata[r][c] = 0;
			}
		}
		this.randomNum();    // Число 2/4 генерируется случайным образом в начале игры
		this.randomNum();
		     // Выполняем функцию dataView, когда игра начинает передавать обновление данных на страницу, обновляем данные на странице
	},

	randomNum:function(){       // Метод генерации случайных чисел и присвоения начального случайного числа mydata
		for(;;){                     // Циклу for здесь нельзя задать фиксированное условие, потому что конечное условие не может быть известно, когда игра запущена, и он может работать только последовательно
			var r = Math.floor(Math.random()*4);      // Задаем случайную величину и пусть это будет координата, в которой число появляется случайным образом
			var c = Math.floor(Math.random()*4);
			if(this.mydata[r][c] == 0){               // Если значение в текущей координате в данных равно 0 или пусто, вставляем случайное число 2 или 4
				var num = Math.random() > 0.5 ? 2 : 4;     // Установленное случайное число 2 или 4 имеет одинаковый шанс выпадения, наполовину открыто
				this.mydata[r][c] = num;
				break;
			}
		}
	},


	dataView:function(table){      // Метод передачи данных на страницу и контроль смены стиля
		let tab=``;
    for(var r = 0;r < 4;r++){
      tab=tab+`|`;
			for(var c = 0;c < 4;c++){

          tab=tab+this.mydata[r][c]
			}
      tab=tab+`| \n `;
		}
    console.log(this.mydata)
    return tab
	},

	isgameover:function(){
		for(var r = 0;r < 4;r++){
			for(var c = 0;c < 4;c++){	
				if (this.mydata[r][c] == 0) {
					return false;
				}
				if (c<3) {
					if (this.mydata[r][c] == this.mydata[r][c+1]) {
						return false;
					}
				}
				if (r<3) {
					if (this.mydata[r][c] == this.mydata[r+1][c]) {
						return false;
					}
				}
			}
		}
		return true;
	},

	//Движение влево
	moveLeft:function(){
		var before = String(this.mydata);
		for(var r = 0;r < 4;r++){
			this.moveLeftInRow(r);
		}
		var after = String(this.mydata);
		if (before != after) {
			this.randomNum();
			if (this.isgameover()) {
				this.status = this.gameover;
			}
			
		}
	},

	moveLeftInRow:function(r){
		for(var c = 0;c < 3;c++){	
			var nextc = this.getNEXTinRow(r,c);
			if (nextc != -1) {
				if (this.mydata[r][c] == 0) {
					this.mydata[r][c] = this.mydata[r][nextc];
					this.mydata[r][nextc] = 0;
					c--;
				}
				else if (this.mydata[r][c] == this.mydata[r][nextc]) {
					this.mydata[r][c] *=2;
					this.mydata[r][nextc] =0;
					this.score += this.mydata[r][c];
				}
			}
			else {
				break;
			}
		}
	},

	getNEXTinRow:function(r,c){
		for(var i = c+1;i < 4;i++){
			if (this.mydata[r][i] != 0) {
				return i;
			}
		}
		return -1;
	},


	//Переместить вправо
	moveRight:function(){
		var before = String(this.mydata);
		for(var r = 0;r < 4;r++){
			this.moveRightInRow(r);
		}
		var after = String(this.mydata);
		if (before != after) {
			this.randomNum();
			if (this.isgameover()) {
				this.status = this.gameover;
			}
			
		}
	},

	moveRightInRow:function(r){
		for(var c = 3;c > 0;c--){	
			var nextc = this.RightgetNEXTinRow(r,c);
			if (nextc != -1) {
				if (this.mydata[r][c] == 0) {
					this.mydata[r][c] = this.mydata[r][nextc] ;
					this.mydata[r][nextc] = 0;
					c++;
				}
				else if (this.mydata[r][c] == this.mydata[r][nextc]) {
					this.mydata[r][c] *=2;
					this.mydata[r][nextc] =0;
					this.score += this.mydata[r][c];
				}
			}
			else {
				break;
			}
		}
	},

	RightgetNEXTinRow:function(r,c){
		for(var i = c-1;i >= 0;i--){
			if (this.mydata[r][i] != 0) {
				return i;
			}
		}
		return -1;
	},


	// Двигаться вверх
	moveTop:function(){
		var before = String(this.mydata);
		for(var r = 0;r < 4;r++){
			this.moveTopInRow(r);
		}
		var after = String(this.mydata);
		if (before != after) {
			this.randomNum();
			if (this.isgameover()) {
				this.status = this.gameover;
			}
			
		}
	},

	moveTopInRow:function(r){
		for(var c = 0;c < 3;c++){	
			var nextc = this.TopgetNEXTinRow(r,c);
			if (nextc != -1) {
				if (this.mydata[c][r] == 0) {
					this.mydata[c][r] = this.mydata[nextc][r] ;
					this.mydata[nextc][r] = 0;
					c++;
				}
				else if (this.mydata[c][r] == this.mydata[nextc][r]) {
					this.mydata[c][r] *=2;
					this.mydata[nextc][r] =0;
					this.score += this.mydata[c][r];
				}
			}
			else {
				break;
			}
		}
	},

	TopgetNEXTinRow:function(r,c){
		for(var i = c+1;i < 4;i++){
			if (this.mydata[i][r] != 0) {
				return i;
			}
		}
		return -1;
	},


	// двигаться вниз
	moveBottom:function(){
		var before = String(this.mydata);
		for(var r = 0;r < 4;r++){
			this.moveBottomInRow(r);
		}
		var after = String(this.mydata);
		if (before != after) {
			this.randomNum();
			if (this.isgameover()) {
				this.status = this.gameover;
			}
			
		}
	},

	moveBottomInRow:function(r){
		for(var c = 3;c > 0;c--){	
			var nextc = this.BottomgetNEXTinRow(r,c);
			if (nextc != -1) {
				if (this.mydata[c][r] == 0) {
					this.mydata[c][r] = this.mydata[nextc][r] ;
					this.mydata[nextc][r] = 0;
					c++;
				}
				else if (this.mydata[c][r] == this.mydata[nextc][r]) {
					this.mydata[c][r] *=2;
					this.mydata[nextc][r] =0;
					this.score += this.mydata[c][r];
				}
			}
			else {
				break;
			}
		}
	},

	BottomgetNEXTinRow:function(r,c){
		for(var i = c-1;i >= 0;i--){
			if (this.mydata[i][r] != 0) {
				return i;
			}
		}
		return -1;
	},

}



Array.prototype.contains = function(target) {
    return this.some( obj => target.includes(obj) );
};

app.use(morgan('tiny'))
app.use(bodyParser.json());
app.use(cors());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.post('/marusia-2048', async (res, req) => {
    
    const request = res.body  
    const inputText = request.request.nlu.tokens 

    if(inputText.contains(initString)) {
      game.start();

      let tab=game.dataView();
        return req.send(sendResponse(`Добро пожаловать в игру "2048"! \n Доступные команды: "Налево","Направо","Вниз","Вверх"  \n 
            Таблица: \n ${tab} `, 
            res.body.session,{
            },
            `Добро пожаловать в игру "2048"! \n Доступные команды: "Налево","Направо","Вниз","Вверх" `,false,[
                {"title": "Налево"},
                {"title": "Направо"},
                {"title": "Вниз"},
                {"title": "Вверх"}
              ]
        ))
        
    }

    let answer = inputText
    if(['налево','лево','влево','направо','право','вправо','вниз','вверх'].includes(answer)){
      let session_state = request.state.session

      //сначала двигаем 
      if(['налево','лево','влево'].includes(answer)){
       
         game.moveLeft();
      }else if(['направо','право','вправо'].includes(answer)){
        game.moveRight();
      }else if(['вниз'].includes(answer)){
        game.moveBottom();
      }else if(['вверх'].includes(answer)){
        game.moveTop();
      }
      }
      
      let tab=game.dataView();
      if (game.status == game.gameover) {
        return req.send(sendResponse(`Вы проиграли!Счёт:${game.score}  \n 
          Таблица: \n ${tab} `, 
          res.body.session,{
          },
          `Вы проиграли!Счёт:${game.score} " `,false,[
              {"title": "Налево"},
              {"title": "Направо"},
              {"title": "Вниз"},
              {"title": "Вверх"}
            ]
      ))
      }
      else{
        return req.send(sendResponse(`Счёт:${game.score} \n Доступные команды: "Налево","Направо","Вниз","Вверх"  \n 
        Таблица: \n ${tab} `, 
        res.body.session,{
        },
        `Счёт:${game.score} " `,false,[
            {"title": "Налево"},
            {"title": "Направо"},
            {"title": "Вниз"},
            {"title": "Вверх"}
          ]
    ))
      }
    }


    );

app.listen(port, () => console.log(` Сервер запущен на PORT=${port} `));