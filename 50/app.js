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
  board:[],
  score : 0,
  rows : 4,
  columns : 4,

  
  setGame:function () {
      this.board = [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
      ]

      //create 2 to begin the game
      this.setTwo();
      this.setTwo();
  },
  
  writeTable:function(){
    let tab=``;
      for(var r = 0;r < 4;r++){
        tab=``+tab+`|`;
        for(var c = 0;c < 4;c++){
            tab=``+tab+this.board[r][c]+`|`
        }
        tab=tab+` \n `;
      }
    return tab
},
   filterZero:function(row){
      return row.filter(num => num != 0); //create new array of all nums != 0
  },
  
   slide:function(row) {
      //[0, 2, 2, 2] 
      row = this.filterZero(row); //[2, 2, 2]
      for (let i = 0; i < row.length-1; i++){
          if (row[i] == row[i+1]) {
              row[i] *= 2;
              row[i+1] = 0;
              this.score += row[i];
              
          }
      } //[4, 0, 2]
      row = this.filterZero(row); //[4, 2]
      //add zeroes
      while (row.length < this.columns) {
          row.push(0);
      } //[4, 2, 0, 0]
      return row;
  },
  
  slideLeft:function () {
      for (let r = 0; r < this.rows; r++) {
          let row = this.board[r];
          row = this.slide(row);
          this.board[r] = row;
      }
  },
  
  slideRight:function () {
      for (let r = 0; r < this.rows; r++) {
          let row = this.board[r];         //[0, 2, 2, 2]
          row.reverse();              //[2, 2, 2, 0]
          row = this.slide(row)            //[4, 2, 0, 0]
          this.board[r] = row.reverse();   //[0, 0, 2, 4];
      }
  },
  
  slideUp:function () {
      for (let c = 0; c < this.columns; c++) {
          let row = [this.board[0][c], this.board[1][c], this.board[2][c], this.board[3][c]];
          row = this.slide(row);
          for (let r = 0; r < this.rows; r++){
              this.board[r][c] = row[r];
          }
      }
  },
  
   slideDown:function() {
      for (let c = 0; c < this.columns; c++) {
          let row = [this.board[0][c], this.board[1][c], this.board[2][c], this.board[3][c]];
          row.reverse();
          row = this.slide(row);
          row.reverse();
          for (let r = 0; r < this.rows; r++){
              this.board[r][c] = row[r];
          }
      }
  },
  
  setTwo:function() {
      if (!this.hasEmptyTile()) {
          return;
      }
      let found = false;
      while (!found) {
          //find random row and column to place a 2   in
          let r = Math.floor(Math.random() * this.rows);
          let c = Math.floor(Math.random() * this.columns);
          if (this.board[r][c] == 0) {
              this.board[r][c] = 2;
              found = true;
          }
      }
  },
  
   hasEmptyTile:function() {
      for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.columns; c++) {
              if (this.board[r][c] == 0) { //at least one zero in the this.board
                  return true;
              }
          }
      }
      return false;
  }
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
    //запуск игры
    if(inputText.contains(initString)) {
      game.setGame();
      return req.send(sendResponse(`Добро пожаловать в игру "2048"! \n Доступные команды: "Налево","Направо","Вниз","Вверх"  \n 
            Таблица: \n ${game.writeTable()} `,res.body.session,{},
            `Добро пожаловать в игру "2048"! \n Доступные команды: "Налево","Направо","Вниз","Вверх" `,false,[
                {"title": "Налево"},
                {"title": "Направо"},
                {"title": "Вниз"},
                {"title": "Вверх"}
              ]
        ))
    }
    //управление игрой
    let answer = inputText[0]
    if(['налево','лево','влево','направо','право','вправо','вниз','вверх'].includes(answer)){
      if(['налево','лево','влево'].includes(answer)){
        game.slideLeft();
        game.setTwo();
      }else if(['направо','право','вправо'].includes(answer)){
        game.slideRight();
        game.setTwo();
      }else if(['вниз'].includes(answer)){
        game.slideDown();
        game.setTwo();
      }else if(['вверх'].includes(answer)){
        game.slideUp();
        game.setTwo();
      }
    }
    //если все клетки заполнились то игрок проиграл
    if (!game.hasEmptyTile()) {
        return req.send(sendResponse(`Вы проиграли!Счёт: ${game.score}  \n Таблица: \n ${game.writeTable()} `, 
            res.body.session,{},
            `${config.lossSound} Вы проиграли!Счёт: ${game.score} " Что бы начать заново,выполните команду "Старт"`,true, 
            [ {"title": "Старт"}]
    ))
    }
    //если счет игры достиг 2048 то игрок выйграл
    if (game.score==2048) {
        return req.send(sendResponse(`Вы выйграли!Счёт: ${game.score}  \n Таблица: \n ${game.writeTable()} `, 
            res.body.session,{},
            `${config.winSound}Вы выйграли!Счёт: ${game.score} " Что бы начать заново,выполните команду "Старт"`,true, 
            [ {"title": "Старт"}]
    ))
    }
    //в остальных случаях игрок может играть дальше
    else{
        return req.send(sendResponse(`Счёт: ${game.score} \n Доступные команды: "Налево","Направо","Вниз","Вверх"  \n 
            Таблица: \n ${game.writeTable()} `, 
            res.body.session,{},`Счёт: ${game.score} " `,false,[
            {"title": "Налево"},
            {"title": "Направо"},
            {"title": "Вниз"},
            {"title": "Вверх"}
            ]   
        ))
    }
})

app.listen(port, () => console.log(` Сервер запущен на PORT=${port} `));