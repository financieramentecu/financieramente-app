/**
 * Alias para SendGridEmailService
 *
 * Este archivo mantiene la nomenclatura de "Repository" para
 * mantener consistencia con la arquitectura DDD, aunque técnicamente
 * SendGridEmailService ya implementa IEmailRepository.
 */
export { SendGridEmailService as SendGridEmailRepository } from '../sendgrid/SendGridEmailService'
