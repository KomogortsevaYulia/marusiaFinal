const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config')
const morgan = require('morgan')
const port = 8888;
const initString = 'старт' 
const chain = config.chain 
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

app.listen(port, () => console.log(` Сервер запущен на PORT=${port} `));