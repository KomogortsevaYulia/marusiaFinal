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

app.post('/marusia-edible-inedible', async (res, req) => {
    
    const request = res.body  
    const inputText = request.request.nlu.tokens 

    if(inputText.contains(initString)) {
        let object=chain[0]

        return req.send(sendResponse(`Добро пожаловать в игру "Съедобное — несъедобное"! \n Доступные команды: "Съем","Выброшу" \n 
            Итак, первый предмет: ${object.title} ${object.smile}`, 
            res.body.session,{
                "question": 0,
                "objects": ``
            },
            `Добро пожаловать в игру "Съедобное — несъедобное"! \n Доступные команды: "Съем","Выброшу" \n 
            Итак, первый предмет: ${object.tts} `,false,[
                {
                  "title": "Съем"
                },
                {
                    "title": "Выброшу"
                }
              ]
        ))
        
    }

    let answer = inputText[0] 
    if(['съем','выброшу'].includes(answer)){{

      let session_state = request.state.session
      if(chain[session_state.question].edible.includes(answer)){
        
        if(session_state.question<chain.length-1){
          let obj=chain[session_state.question+1]
          session_state.objects=session_state.objects+chain[session_state.question].title+` ${chain[session_state.question].smile} - ${chain[session_state.question].edible}\n`;
          return req.send(sendResponse(`Правильно! Правильные ответы :\n ${session_state.objects}\n Следующий объект: ${obj.title} ${obj.smile}`, res.body.session, {
            "question": session_state.question+1,
            "objects": session_state.objects
          }, ` Правильно! \n Следующий объект: ${obj.title}`,false, [
            {
              "title": "Съем"
            },
            {
                "title": "Выброшу"
            }
          ]
          ))
        }else{
          return req.send(sendResponse(`Вы выйграли! Правильные ответы :\n ${session_state.objects} \n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
            "question": 0,
            "objects": session_state.objects
          }, `${config.winSound} Вы выйграли! \n Что бы начать заново,выполните команду "Старт"`,true, [
            {
              "title": "Старт"
            }
          ]
          ))
        }
      }else{
        return req.send(sendResponse(`Вы проиграли! Правильные ответы :\n ${session_state.objects}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
          "question": 0,
          "objects": session_state.objects
        }, `${config.lossSound} Вы проиграли! \n Что бы начать заново,выполните команду "Старт"`,true, [
          {
            "title": "Старт"
          }
        ]
        ))
      }
  }
}});

app.post('/marusia-twenty-one', async (res, req) => {
    
    const request = res.body  
    const inputText = request.request.nlu.tokens 

    if(inputText.contains(initString)) {
        let card=deck[Math.floor(Math.random() * deck.length)]
        let card2=deck[Math.floor(Math.random() * deck.length)]

        return req.send(sendResponse(`Добро пожаловать в игру "Двадцать одно"! \n Доступные команды: "Ещё","Хватит" \n 
            Ваша первая карта: ${card.answers} \n Маруся так же взяла карту.`, 
            res.body.session,{
                "marusia": card2.answers,
                "player": card.answers,
                "marusiaScore": card2.value,
                "playerScore": card.value 
            },
            `Добро пожаловать в игру "Двадцать одно"! \n Доступные команды: "Ещё","Хватит" \n 
            Ваша первая карта: ${card.tts} \n Маруся так же взяла карту.`,false,[
                {
                  "title": "Еще"
                },{
                    "title": "Хватит"
                  }
              ]
        ))
        
    }
    if(['хватит'].includes(inputText[0])){
        let session_state = request.state.session
        // маруся берет карты(делает это рандомно)
        if(session_state.marusiaScore<=19 & Math.random() < 0.5 ){
                let card=deck[Math.floor(Math.random() * deck.length)]
                session_state.marusia=session_state.marusia+"; "+card.answers
                session_state.marusiaScore=session_state.marusiaScore+card.value  
        }
        if(session_state.marusiaScore<=19 & Math.random() < 0.5 ){
          let card=deck[Math.floor(Math.random() * deck.length)]
          session_state.marusia=session_state.marusia+"; "+card.answers
          session_state.marusiaScore=session_state.marusiaScore+card.value 
        }
        if(session_state.marusiaScore<=19 & Math.random() < 0.5 ){
          let card=deck[Math.floor(Math.random() * deck.length)]
          session_state.marusia=session_state.marusia+"; "+card.answers
          session_state.marusiaScore=session_state.marusiaScore+card.value 
        }
        if( (session_state.playerScore>21 & session_state.marusiaScore<=21) || (session_state.playerScore-session_state.marusiaScore<0 & session_state.marusiaScore<=21)
        ){
        return req.send(sendResponse(`Вы проиграли! Ваши карты : ${session_state.player} \nКарты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
            "marusia": session_state.marusia,
            "player": session_state.player,
            "marusiaScore": session_state.marusiaScore,
            "playerScore": session_state.playerScore
        }, `${config.lossSound} Вы проиграли! Ваши карты : ${session_state.player} \n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`,true, [
        {
          "title": "Старт"
        }
      ]
        ))
    }else if( ((session_state.playerScore==session_state.marusiaScore) || 
        (session_state.playerScore> 21 & session_state.marusiaScore>21) )
        ){
        return req.send(sendResponse(`Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
            "marusia": session_state.marusia,
            "player": session_state.player,
            "marusiaScore": session_state.marusiaScore,
            "playerScore": session_state.playerScore
        }, `${config.winSound} Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`,true, [
            {
              "title": "Старт"
            }
          ]
        ))
    }
    else if((session_state.playerScore<=21 & session_state.marusiaScore>21) || (session_state.playerScore>session_state.marusiaScore & session_state.playerScore<=21)){
        return req.send(sendResponse(`Вы выйграли! Ваши карты : ${session_state.player} \n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
            "marusia": session_state.marusia,
            "player": session_state.player,
            "marusiaScore": session_state.marusiaScore,
            "playerScore": session_state.playerScore
        }, `${config.winSound} Вы выйграли! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`,true,  [
            {
              "title": "Старт"
            }
          ]
        ))
    }
    }

    if(['еще','ещё'].includes(inputText[0])) {
         
        let session_state = request.state.session

            let card=deck[Math.floor(Math.random() * deck.length)]
    
            session_state.player=session_state.player+"; "+card.answers
            session_state.playerScore=session_state.playerScore+card.value 

            let m=false
                if(session_state.marusiaScore<=19 & Math.random() < 0.5 ){
                  let card=deck[Math.floor(Math.random() * deck.length)]
                  session_state.marusia=session_state.marusia+"; "+card.answers
                  session_state.marusiaScore=session_state.marusiaScore+card.value  
                  m=true
            }
            
            if( (session_state.playerScore>21 & session_state.marusiaScore<=21) 
                ){
                return req.send(sendResponse(`Вы проиграли! Ваши карты : ${session_state.player} \nКарты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `${config.lossSound} Вы проиграли! Ваши карты : ${session_state.player} \nКарты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`,true,  [
                {
                  "title": "Старт"
                }
              ]
                ))
            }else if( ( 
                (session_state.playerScore> 21 & session_state.marusiaScore>21) || (session_state.playerScore==21 & session_state.marusiaScore==21))
                ){
                return req.send(sendResponse(`Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `${config.winSound} Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`,true, [
                    {
                      "title": "Старт"
                    }
                  ]
                ))
            }
            else if((session_state.playerScore==21 & session_state.marusiaScore>21)|| session_state.marusiaScore>21 ){
                return req.send(sendResponse(`Вы выйграли! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `${config.winSound} Вы выйграли! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, true,[
                    {
                      "title": "Старт"
                    }
                  ]
                ))
            }
            else{
              
                if (m){
                return req.send(sendResponse(`Новая карта: ${card.answers} \n Ваши карты: ${session_state.player} 
                \n Маруся так же берет карту.`, res.body.session, session_state, `Новая карта: ${card.tts} \n Ваши карты: ${session_state.player}
                 \n Маруся так же берет карту.`,true,[
                    {
                      "title": "Еще"
                    },{
                        "title": "Хватит"
                      }
                  ])) 
                }else{
                  return req.send(sendResponse(`Новая карта: ${card.answers} \n Ваши карты: ${session_state.player} 
                  \n Маруся не берет карту.`, res.body.session, session_state, `Новая карта: ${card.tts} \n Ваши карты: ${session_state.player}
                   \n Маруся не берет карту.`,true,[
                      {
                        "title": "Еще"
                      },{
                          "title": "Хватит"
                        }
                    ])) 
                }
                
            }
    }

    return req.send(sendResponse(`Неизвестная команда! \n Доступные команды: "Ещё","Хватит" \n 
    Что бы начать игру выполните команду "Старт"`, res.body.session,{},`Неизвестная команда! \n Доступные команды: "Ещё","Хватит" \n 
    Что бы начать игру выполните команду "Старт"`,false,[
        {
          "title": "Старт"
        }
      ]))
});

app.listen(port, () => console.log(` Сервер запущен на PORT=${port} `));