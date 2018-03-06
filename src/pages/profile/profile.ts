import { Component, Inject } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Account, UserModel, PageModel, UEMModel, UCMModel, UGMModel } from '../../providers/api/api.module';
import { InAppBrowser } from '@ionic-native/in-app-browser';

@Component({
  selector: 'page-profile',
  templateUrl: 'profile.html'
})
export class ProfilePage {

    public loading: boolean = true;
    public user:any;
    public page:any;

    public coursesCount: number;
    public eventsCount: number;
    public groupsCount: number;

    public userPagesUrls: any = {
        courses: 'my-courses/',
        groups: 'my-clubs/',
        events: 'my-events/',
    };
    
    constructor(public navCtrl: NavController, public userModel: UserModel, public pageModel: PageModel, public account: Account,
        ucmModel: UCMModel, uemModel: UEMModel, ugmModel: UGMModel, private iab: InAppBrowser, @Inject('Configuration') private config ) {
        
        let p1 = userModel.get([account.session.id]).then(()=>{
                this.user = this.userModel.list[account.session.id];
                return pageModel.get([this.user.datum.organization_id]).then(()=>{
                    this.page = this.pageModel.list[this.user.datum.organization_id];
                });
            }),
            p2 = ucmModel.get([account.session.id]).then(()=>this.coursesCount=ucmModel.list[account.session.id].datum.length),
            p3 = uemModel.get([account.session.id]).then(()=>this.eventsCount=uemModel.list[account.session.id].datum.length),
            p4 = ugmModel.get([account.session.id]).then(()=>this.groupsCount=ugmModel.list[account.session.id].datum.length);

        p1.then(()=>p2.then(()=>p3.then(()=>p4.then(()=>this.loading=false))));
    }

    openUserPages( type ){
        let url = this.config.twic_url + this.userPagesUrls[type];
        this.iab.create( url ,'_system');
    }

    back(){
        this.navCtrl.pop();
    }

    logout(){
        //console.log('WTF?');
        this.account._logout();
    }
}
