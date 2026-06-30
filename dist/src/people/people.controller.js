"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeopleController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const people_service_1 = require("./people.service");
const swagger_1 = require("@nestjs/swagger");
let PeopleController = class PeopleController {
    constructor(svc) {
        this.svc = svc;
    }
    findSellers(req) { return this.svc.findAllSellers(req.user.tenantId); }
    createSeller(req, body) { return this.svc.createSeller(req.user.tenantId, body); }
    updateSeller(req, id, body) { return this.svc.updateSeller(req.user.tenantId, id, body); }
    findPartners(req) { return this.svc.findAllPartners(req.user.tenantId); }
    createPartner(req, body) { return this.svc.createPartner(req.user.tenantId, body); }
    updatePartner(req, id, body) { return this.svc.updatePartner(req.user.tenantId, id, body); }
    findEmployees(req) { return this.svc.findAllEmployees(req.user.tenantId); }
    createEmployee(req, body) { return this.svc.createEmployee(req.user.tenantId, body); }
    updateEmployee(req, id, body) { return this.svc.updateEmployee(req.user.tenantId, id, body); }
    getRanking(req, month) {
        return this.svc.getRanking(req.user.tenantId, month || new Date().toISOString().slice(0, 7));
    }
};
exports.PeopleController = PeopleController;
__decorate([
    (0, common_1.Get)('sellers'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "findSellers", null);
__decorate([
    (0, common_1.Post)('sellers'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "createSeller", null);
__decorate([
    (0, common_1.Patch)('sellers/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "updateSeller", null);
__decorate([
    (0, common_1.Get)('partners'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "findPartners", null);
__decorate([
    (0, common_1.Post)('partners'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "createPartner", null);
__decorate([
    (0, common_1.Patch)('partners/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "updatePartner", null);
__decorate([
    (0, common_1.Get)('employees'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "findEmployees", null);
__decorate([
    (0, common_1.Post)('employees'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Patch)('employees/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Get)('ranking'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PeopleController.prototype, "getRanking", null);
exports.PeopleController = PeopleController = __decorate([
    (0, swagger_1.ApiTags)('people'),
    (0, common_1.Controller)('people'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [people_service_1.PeopleService])
], PeopleController);
//# sourceMappingURL=people.controller.js.map