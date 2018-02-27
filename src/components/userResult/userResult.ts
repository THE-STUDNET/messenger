import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';
import { UserModel, PageModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';

@Component({
  selector: 'user-result',
  templateUrl: 'userResult.html'
})

export class UserResultComponent {

    @Input('user-id') user_id: number;

    loading: boolean = true;
    public user: any;
    public page: any;

    constructor( public navCtrl: NavController, private userModel:UserModel,
        public pageModel: PageModel, public pipesProvider:PipesProvider ) {}

    ngOnChanges(){
        this.loading = true;

        this.userModel.queue([this.user_id]).then(()=>{
            this.user = this.userModel.list[this.user_id];
            if( this.user.datum.organization_id ){
                this.pageModel.queue([this.user.datum.organization_id]).then(()=>{
                    this.page = this.pageModel.list[this.user.datum.organization_id];
                    this.loading = false;
                });
            }else{
                this.loading = false;
            }
        });
    }

    
    /*
    goToConversation(){
        this.navCtrl.push(ConversationPage,{ conversation: this.conversation });
    }*/
}
