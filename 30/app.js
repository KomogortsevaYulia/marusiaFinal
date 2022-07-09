const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config')
const morgan = require('morgan')
const port = 3000;
const initString = 'старт' 
const questions = config.questions 
const deck = config.deck 
const app = express();
const mergeImages =require('merge-images') ;

const sendResponse = (text, session, session_state = {}, TTStext = text, end_session = false, card = []) => {
    return {
        "response": {
            "text": text,
            "tts": TTStext,
            "end_session": end_session,
        },
        "session": {
            ...session,
        },
        "session_state": session_state,
        "version": "1.0"
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

app.post('/marusia-twenty-one', async (res, req) => {
    
    const request = res.body
    const command = request.request.command   
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
            Ваша первая карта: ${card.answers} \n Маруся так же взяла карту.`
        ))
        
    }

    if(['еще','ещё','хватит'].includes(inputText[0])) {
         
        let session_state = request.state.session

        if(['хватит'].includes(inputText[0])){
            // маруся берет карты(делает это рандомно)
            while(session_state.marusiaScore<=19 ){
                var random = Math.random() < 0.5;
                if(random){
                    let card=deck[Math.floor(Math.random() * deck.length)]
                    session_state.marusia=session_state.marusia+","+card.answers
                    session_state.marusiaScore=session_state.marusiaScore+card.value 
                }
            }
        }
        if(['еще','ещё'].includes(inputText[0])) {
            let card=deck[Math.floor(Math.random() * deck.length)]
            let card2=deck[Math.floor(Math.random() * deck.length)]
    
            session_state.player=session_state.player+"; "+card.answers
            session_state.playerScore=session_state.playerScore+card.value 
            session_state.marusia=session_state.marusia+"; "+card2.answers
            session_state.marusiaScore=session_state.marusiaScore+card2.value 

        }
            
            if( (session_state.playerScore>21 & session_state.marusiaScore<=21) || (session_state.playerScore-session_state.marusiaScore<0 & session_state.marusiaScore<=21)
                ){
                return req.send(sendResponse(`Вы проиграли! Ваши карты : ${session_state.player} \nКарты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `Вы проиграли! Ваши карты : ${session_state.player} \nКарты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, false, 
                ))
            }else if( ((session_state.playerScore==session_state.marusiaScore) || 
                (session_state.playerScore> 21 & session_state.marusiaScore>21) )
                ){
                return req.send(sendResponse(`Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `Ничья! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, false, 
                ))
            }
            else if((session_state.playerScore<=21 & session_state.marusiaScore>21) || (session_state.playerScore>session_state.marusiaScore & session_state.playerScore<=21)){
                return req.send(sendResponse(`Вы выйграли! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, res.body.session, {
                    "marusia": session_state.marusia,
                    "player": session_state.player,
                    "marusiaScore": session_state.marusiaScore,
                    "playerScore": session_state.playerScore
                }, `Вы выйграли! Ваши карты : ${session_state.player}\n Карты Маруси : ${session_state.marusia}\n Что бы начать заново,выполните команду "Старт"`, false, 
                ))
            }
            else{
                return req.send(sendResponse(`Новая карта: ${card.answers} \n Ваши карты: ${session_state.player} 
                \n\n Маруся так же берет карту.`, res.body.session, session_state, `Новая карта: ${card.answers} \n Ваши карты: ${session_state.player}
                 \n\n Маруся так же берет карту.`)) 
            }
    }

    return req.send(sendResponse('Неизвестная команда!', res.body.session))
});

app.listen(port, () => console.log(` Сервер запущен на PORT=${port} `));