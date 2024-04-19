import Controller from '../interfaces/controller.interface';
import { Request, Response, NextFunction, Router } from 'express';
import { checkIdParam } from "../middlewares/deviceIdParam.middleware";
import DataService from "../modules/services/data.service";
import { config } from "../config";

// @ts-ignore
const dataService = require("../modules/services/data.service");

let testArr = [4, 5, 6, 3, 5, 3, 7, 5, 13, 5, 6, 4, 3, 6, 3, 6];

class DataController implements Controller {
    public path = '/api/data';
    public router = Router();
    private dataService = new DataService();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/latest`, this.getLatestReadingsFromAllDevices);
        this.router.get(`${this.path}/:id`, this.findById);
        this.router.get(`${this.path}/:id/latest`, this.findLatestById);
        this.router.get(`${this.path}/:id/:num`, this.findByRange);
        this.router.get(`${this.path}/latest`, this.getLatestReadingsFromAllDevices);
        this.router.get(`${this.path}/:id`, checkIdParam, this.getAllDeviceData);
        this.router.get(`${this.path}/:id/latest`, checkIdParam, this.findLatestById);
        this.router.get(`${this.path}/:id/:num`, checkIdParam, this.findByRange);

        this.router.post(`${this.path}/:id`, this.addData);
        this.router.post(`${this.path}/:id`, checkIdParam, this.addData);

        this.router.delete(`${this.path}/all`, this.deleteAll);
        this.router.delete(`${this.path}/:id`, this.deleteById);
    }

    private addData = async (request: Request, response: Response, next: NextFunction) => {
        const { id } = request.params;

        if (request.body.elem) {
            // Dodawanie ogólnych danych
            const { elem } = request.body;
            testArr.push(elem);
            response.status(200).json(elem);
        } else if (request.body.air) {
            // Dodawanie danych dotyczących jakości powietrza
            const { air } = request.body;
            const data = {
                deviceId: Number(id),
                temperature: air[0],
                pressure: air[1],
                humidity: air[2],
                date: Date
            };
            try {
                await this.dataService.createData(data);
                response.status(200).json(data);
            } catch (error) {
                console.error(`Błąd walidacji: ${error.message}`);
                response.status(400).json({ error: 'Nieprawidłowe dane wejściowe.' });
            }
        } else {
            response.status(400).json({ error: 'Nieprawidłowe ciało żądania.' });
        }
    };

    private getAllDeviceData = async (request: Request, response: Response, next: NextFunction) => {
        const { id } = request.params;

        try {
            const allData = await this.dataService.query(id);
            response.status(200).json(allData);
        } catch (error) {
            console.error(`Błąd walidacji: ${error.message}`);
            response.status(400).json({ error: 'Nieprawidłowe ID urządzenia.' });
        }
    };

    private getLatestReadingsFromAllDevices = async (request: Request, response: Response, next: NextFunction) => {
        response.status(200).json(testArr);
    }

    private findById = async (request: Request, response: Response, next: NextFunction) => {
        const { id } = request.params;
        response.status(200).json(testArr[Number(id)]);
        try {
            const latestData = await this.dataService.getAllNewest();
            response.status(200).json(latestData);
        } catch (error) {
            console.error(`Błąd odczytu: ${error.message}`);
            response.status(400).json({ error: 'Błąd odczytu z bazy danych.' });
        }
    }

    private findLatestById = async (request: Request, response: Response, next: NextFunction) => {
        let maxVal = testArr[0] || -Infinity;

        testArr.forEach(v => {
            if (maxVal < v) maxVal = v;
        })
        const { id } = request.params;

        response.status(200).json(maxVal)
        try {
            const latestData = await this.dataService.get(id);
            response.status(200).json(latestData);
        } catch (error) {
            console.error(`Błąd odczytu: ${error.message}`);
            response.status(400).json({ error: 'Błąd odczytu z bazy danych.' });
        }
    }

    private findByRange = async (request: Request, response: Response, next: NextFunction) => {
        const { id, num } = request.params;
        const data = testArr.slice(Number(id) - 1, Number(id) - 1 + Number(num))
        response.status(200).json(data)
    }

    private deleteById = async (request: Request, response: Response, next: NextFunction) => {
        const { id } = request.params;
        const elem = testArr[Number(id) - 1];
        testArr.splice(Number(id) - 1, 1);
        response.status(200).json(elem);
        try {
            const latestData = await this.dataService.deleteData(id);
            response.status(200).json(latestData);
        } catch (error) {
            console.error(`Błąd usuwania: ${error.message}`);
            response.status(400).json({ error: 'Błąd usuwania z bazy danych.' });
        }
    }

    private deleteAll = async (request: Request, response: Response, next: NextFunction) => {
        testArr = [];
        response.status(200).json(testArr);
        try {
            Array.from({ length: config.supportedDevicesNum }, async (_, i) => {
                await this.dataService.deleteData(i.toString());
            });
            response.status(200).json({ message: "Wszystkie dane zostały usunięte." });
        } catch (error) {
            console.error(`Błąd usuwania: ${error.message}`);
            response.status(400).json({ error: 'Błąd usuwania z bazy danych.' });
        }
    }
}

export default DataController;
