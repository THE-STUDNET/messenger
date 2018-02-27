import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { ConversationModel } from '../models/conversation_model';

@Injectable()
export class ConversationService {
    
    constructor( public api:Api, public model:ConversationModel ){}

    getUsersConversationId( users: number[] ){
        return this.api.send('conversation.getIdByUser',{ user_id: users });
    }

    createConversation( users: number[], name?:string ){
        return this.api.send('conversation.create',{users:users});
    }

    read( conversation_id:number ){
        return this.api.send('conversation.read',{id: conversation_id}).then(()=>{
            if( this.model.list[conversation_id] && this.model.list[conversation_id].datum ){
                this.model.list[conversation_id].datum.conversation_user.read_date = null;
                this.model._updateModelCache( conversation_id );
            }
        });
    }
    
}