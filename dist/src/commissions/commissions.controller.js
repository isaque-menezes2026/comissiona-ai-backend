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
exports.CommissionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const commissions_service_1 = require("./commissions.service");
const swagger_1 = require("@nestjs/swagger");
let CommissionsController = class CommissionsController {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(req, q) { return this.svc.findAll(req.user.tenantId, q); }
    mySummary(req) { return this.svc.findMySummary(req.user.tenantId, req.user.sellerId); }
    findOne(req, id) { return this.svc.findOne(req.user.tenantId, id); }
    cancel(req, id, body) {
        return this.svc.cancel(req.user.tenantId, id, body.reason, req.user.id);
    }
    processInvoice(req, body) {
        return this.svc.processInvoice(req.user.tenantId, body, req.user.id);
    }
};
exports.CommissionsController = CommissionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-summary'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "mySummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('process-invoice'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "processInvoice", null);
exports.CommissionsController = CommissionsController = __decorate([
    (0, swagger_1.ApiTags)('commissions'),
    (0, common_1.Controller)('commissions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [commissions_service_1.CommissionsService])
], CommissionsController);
//# sourceMappingURL=commissions.controller.js.map